// @ts-nocheck
/**
 * Branch Operations API — QR receipt, installation allocations, evidence submission.
 *
 * Blueprint Sections: 9 (Cabang), 12 (Allocation), 13 (Evidence→Allocation),
 * 26 (Idempotency), 27 (Race Condition)
 */
import { Router, type IRouter } from "express";
import { eq, and, sql, desc, or, ilike } from "drizzle-orm";
import crypto from "crypto";
import {
    db,
    stockOutTable,
    stockOutItemsTable,
    itemsTable,
    materialTrackingTable,
    materialReceiptsTable,
    materialTrackingEventsTable,
    installationAllocationsTable,
    installationEvidenceTable,
    branchesTable,
    usersTable,
    warehousesTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
import { auditCrossDistrictEvidence } from "../lib/geo-districts";

const router: IRouter = Router();

const SLA_DAYS = 7;
const MISMATCH_THRESHOLD_METERS = 100; // configurable

// ─── LIST INCOMING SHIPMENTS FOR BRANCH ───
router.get("/branch/shipments", requireAuth, requireRole("CABANG", "ADMIN"), async (req, res): Promise<void> => {
    let branchId = req.session.branchId;
    if (!branchId && req.session.userRole === "ADMIN") {
        if (req.query.branchId) branchId = parseInt(req.query.branchId as string);
    }

    const conditions: any[] = [
        eq(stockOutTable.status, "DIKIRIM")
    ];
    if (branchId) {
        conditions.push(eq(stockOutTable.destinationBranchId, branchId));
    }

    const shipments = await db
        .select({
            id: stockOutTable.id,
            referenceNo: stockOutTable.referenceNo,
            destinationBranchId: stockOutTable.destinationBranchId,
            destinationBranchName: branchesTable.name,
            warehouseId: stockOutTable.warehouseId,
            warehouseName: warehousesTable.name,
            qrToken: stockOutTable.qrToken,
            notes: stockOutTable.notes,
            transactionDate: stockOutTable.transactionDate,
            releasedAt: stockOutTable.releasedAt,
            createdAt: stockOutTable.createdAt,
        })
        .from(stockOutTable)
        .leftJoin(branchesTable, eq(stockOutTable.destinationBranchId, branchesTable.id))
        .leftJoin(warehousesTable, eq(stockOutTable.warehouseId, warehousesTable.id))
        .where(and(...conditions))
        .orderBy(desc(stockOutTable.createdAt));

    const result = await Promise.all(shipments.map(async (s) => {
        const itemsSummary = await db
            .select({
                id: stockOutItemsTable.id,
                itemId: stockOutItemsTable.itemId,
                itemName: itemsTable.name,
                itemCode: itemsTable.code,
                quantity: stockOutItemsTable.quantity,
            })
            .from(stockOutItemsTable)
            .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
            .where(eq(stockOutItemsTable.stockOutId, s.id));

        const trackingUnits = await db
            .select({
                trackingId: materialTrackingTable.id,
                trackingUuid: materialTrackingTable.uuid,
                status: materialTrackingTable.status,
                slaStartAt: materialTrackingTable.slaStartAt,
                slaDeadlineAt: materialTrackingTable.slaDeadlineAt,
                receivedAt: materialTrackingTable.receivedAt,
                receivedBy: materialTrackingTable.receivedBy,
                receivedByName: usersTable.fullName,
                itemId: itemsTable.id,
                itemName: itemsTable.name,
                itemCode: itemsTable.code,
                txItemId: stockOutItemsTable.id,
            })
            .from(materialTrackingTable)
            .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
            .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
            .leftJoin(usersTable, eq(materialTrackingTable.receivedBy, usersTable.id))
            .where(eq(stockOutItemsTable.stockOutId, s.id))
            .orderBy(materialTrackingTable.id);

        const totalUnits = trackingUnits.length;
        const receivedUnits = trackingUnits.filter(u => u.status !== "MENUNGGU_DITERIMA" || !!u.receivedAt).length;
        const pendingUnits = totalUnits - receivedUnits;

        let receiptStatus = "PENDING";
        if (totalUnits > 0 && pendingUnits === 0) {
            receiptStatus = "COMPLETED";
        } else if (receivedUnits > 0) {
            receiptStatus = "PARTIAL";
        }

        return {
            ...s,
            items: itemsSummary,
            totalUnits,
            receivedUnits,
            pendingUnits,
            receiptStatus,
            isFullyReceived: totalUnits > 0 && pendingUnits === 0,
            units: trackingUnits,
        };
    }));

    res.json({ data: result });
});

// ─── GET DETAIL SHIPMENT (BY QR TOKEN, REF NO, OR ID) ───
router.get("/branch/shipment/:tokenOrId", requireAuth, requireRole("CABANG", "ADMIN"), async (req, res): Promise<void> => {
    const param = req.params.tokenOrId;
    const isNum = !isNaN(parseInt(param));

    const [shipment] = await db
        .select({
            id: stockOutTable.id,
            referenceNo: stockOutTable.referenceNo,
            destinationBranchId: stockOutTable.destinationBranchId,
            destinationBranchName: branchesTable.name,
            warehouseId: stockOutTable.warehouseId,
            warehouseName: warehousesTable.name,
            qrToken: stockOutTable.qrToken,
            notes: stockOutTable.notes,
            transactionDate: stockOutTable.transactionDate,
            releasedAt: stockOutTable.releasedAt,
            createdAt: stockOutTable.createdAt,
        })
        .from(stockOutTable)
        .leftJoin(branchesTable, eq(stockOutTable.destinationBranchId, branchesTable.id))
        .leftJoin(warehousesTable, eq(stockOutTable.warehouseId, warehousesTable.id))
        .where(
            or(
                eq(stockOutTable.qrToken, param),
                eq(stockOutTable.referenceNo, param),
                ...(isNum ? [eq(stockOutTable.id, parseInt(param))] : [])
            )
        );

    if (!shipment) {
        res.status(404).json({ error: "Pengiriman tidak ditemukan" });
        return;
    }

    const trackingUnits = await db
        .select({
            trackingId: materialTrackingTable.id,
            trackingUuid: materialTrackingTable.uuid,
            status: materialTrackingTable.status,
            slaStartAt: materialTrackingTable.slaStartAt,
            slaDeadlineAt: materialTrackingTable.slaDeadlineAt,
            receivedAt: materialTrackingTable.receivedAt,
            receivedBy: materialTrackingTable.receivedBy,
            receivedByName: usersTable.fullName,
            itemId: itemsTable.id,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
            txItemId: stockOutItemsTable.id,
        })
        .from(materialTrackingTable)
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .leftJoin(usersTable, eq(materialTrackingTable.receivedBy, usersTable.id))
        .where(eq(stockOutItemsTable.stockOutId, shipment.id))
        .orderBy(materialTrackingTable.id);

    const itemsSummary = await db
        .select({
            id: stockOutItemsTable.id,
            itemId: stockOutItemsTable.itemId,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
            quantity: stockOutItemsTable.quantity,
        })
        .from(stockOutItemsTable)
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .where(eq(stockOutItemsTable.stockOutId, shipment.id));

    const totalUnits = trackingUnits.length;
    const receivedUnits = trackingUnits.filter(u => u.status !== "MENUNGGU_DITERIMA" || !!u.receivedAt).length;
    const pendingUnits = totalUnits - receivedUnits;

    let receiptStatus = "PENDING";
    if (totalUnits > 0 && pendingUnits === 0) {
        receiptStatus = "COMPLETED";
    } else if (receivedUnits > 0) {
        receiptStatus = "PARTIAL";
    }

    res.json({
        shipment,
        items: itemsSummary,
        totalUnits,
        receivedUnits,
        pendingUnits,
        receiptStatus,
        isFullyReceived: totalUnits > 0 && pendingUnits === 0,
        units: trackingUnits,
    });
});

// ─── RECEIVE SINGLE UNIT VIA SCAN (ENFORCES NO-RESCAN) ───
router.post("/branch/receive-unit", requireAuth, requireRole("CABANG", "ADMIN"), async (req, res): Promise<void> => {
    const { trackingId, trackingUuid } = req.body;
    if (!trackingId && !trackingUuid) {
        res.status(400).json({ error: "ID atau UUID unit tracking wajib diisi" });
        return;
    }

    const condition = trackingId 
        ? eq(materialTrackingTable.id, parseInt(String(trackingId)))
        : eq(materialTrackingTable.uuid, String(trackingUuid));

    const [tracking] = await db
        .select({
            id: materialTrackingTable.id,
            uuid: materialTrackingTable.uuid,
            status: materialTrackingTable.status,
            receivedAt: materialTrackingTable.receivedAt,
            branchId: materialTrackingTable.branchId,
            transactionItemId: materialTrackingTable.transactionItemId,
            stockOutId: stockOutItemsTable.stockOutId,
            itemId: stockOutItemsTable.itemId,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
        })
        .from(materialTrackingTable)
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .where(condition);

    if (!tracking) {
        res.status(404).json({ error: "Unit material tidak ditemukan" });
        return;
    }

    // Check branch access (ADMIN can act for destination branch)
    const userBranchId = req.session.branchId ?? (req.session.userRole === "ADMIN" ? tracking.branchId : null);
    if (!userBranchId || (req.session.userRole !== "ADMIN" && tracking.branchId !== userBranchId)) {
        res.status(403).json({ error: "Cabang Anda tidak sesuai dengan tujuan pengiriman material ini" });
        return;
    }

    // Check if ALREADY received (Prevent Re-Scanning!)
    if (tracking.status !== "MENUNGGU_DITERIMA" || tracking.receivedAt) {
        res.status(400).json({
            error: `Unit material "${tracking.itemName}" sudah diterima sebelumnya dan tidak dapat di-scan ulang!`,
            alreadyReceived: true,
            unit: tracking,
        });
        return;
    }

    const now = new Date();

    // Process receipt
    await db.transaction(async (tx) => {
        await tx.update(materialTrackingTable).set({
            status: "DITERIMA_CABANG",
            receivedAt: now,
            receivedBy: req.session.userId,
        }).where(eq(materialTrackingTable.id, tracking.id));

        await tx.insert(materialTrackingEventsTable).values({
            trackingId: tracking.id,
            eventType: "BRANCH_RECEIVED",
            userId: req.session.userId,
            metadata: { trackingUuid: tracking.uuid, itemId: tracking.itemId, itemName: tracking.itemName },
        });

        // Count remaining units for this shipment
        const allUnits = await tx
            .select({
                id: materialTrackingTable.id,
                status: materialTrackingTable.status,
            })
            .from(materialTrackingTable)
            .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
            .where(eq(stockOutItemsTable.stockOutId, tracking.stockOutId));

        const totalUnits = allUnits.length;
        const receivedUnits = allUnits.filter(u => u.id === tracking.id || u.status !== "MENUNGGU_DITERIMA").length;
        const remainingUnits = totalUnits - receivedUnits;

        // If all units now received, record in materialReceiptsTable
        if (remainingUnits === 0) {
            const [existingReceipt] = await tx.select().from(materialReceiptsTable)
                .where(and(
                    eq(materialReceiptsTable.transactionId, tracking.stockOutId),
                    eq(materialReceiptsTable.branchId, userBranchId)
                ));
            if (!existingReceipt) {
                const [so] = await tx.select({ qrToken: stockOutTable.qrToken }).from(stockOutTable).where(eq(stockOutTable.id, tracking.stockOutId));
                await tx.insert(materialReceiptsTable).values({
                    transactionId: tracking.stockOutId,
                    qrToken: so?.qrToken || `TX-${tracking.stockOutId}`,
                    receivedBy: req.session.userId!,
                    branchId: userBranchId,
                });
            }
        }

        res.json({
            message: `Unit "${tracking.itemName}" berhasil diterima di cabang!`,
            unit: { ...tracking, status: "DITERIMA_CABANG", receivedAt: now.toISOString() },
            totalUnits,
            receivedUnits,
            remainingUnits,
            isFullyReceived: remainingUnits === 0,
        });
    });
});

// ─── DASHBOARD STATS FOR CABANG ───
router.get("/branch/dashboard-stats", requireAuth, requireRole("CABANG", "ADMIN"), async (req, res): Promise<void> => {
    let branchId = req.session.branchId;
    if (!branchId && req.session.userRole === "ADMIN") {
        if (req.query.branchId) branchId = parseInt(req.query.branchId as string);
    }

    let branchName = "Semua Cabang";
    if (branchId) {
        const [b] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId));
        if (b) branchName = b.name;
    }

    const trkConditions: any[] = [];
    if (branchId) trkConditions.push(eq(materialTrackingTable.branchId, branchId));
    const whereTrk = trkConditions.length > 0 ? and(...trkConditions) : undefined;

    const allTracking = await db
        .select({
            id: materialTrackingTable.id,
            status: materialTrackingTable.status,
            receivedAt: materialTrackingTable.receivedAt,
        })
        .from(materialTrackingTable)
        .where(whereTrk);

    const pendingUnits = allTracking.filter(t => t.status === "MENUNGGU_DITERIMA" || !t.receivedAt).length;
    const receivedUnits = allTracking.filter(t => ["DITERIMA_CABANG", "MENUNGGU_PEMASANGAN"].includes(t.status)).length;
    const installedUnits = allTracking.filter(t => ["TERPASANG", "MENUNGGU_VERIFIKASI", "TERVERIFIKASI"].includes(t.status)).length;
    const verifiedUnits = allTracking.filter(t => t.status === "TERVERIFIKASI").length;

    const soConditions: any[] = [eq(stockOutTable.status, "DIKIRIM")];
    if (branchId) soConditions.push(eq(stockOutTable.destinationBranchId, branchId));

    const activeShipments = await db
        .select({ id: stockOutTable.id })
        .from(stockOutTable)
        .where(and(...soConditions));

    res.json({
        branchId,
        branchName,
        activeShipmentsCount: activeShipments.length,
        pendingUnitsCount: pendingUnits,
        receivedUnitsCount: receivedUnits,
        installedUnitsCount: installedUnits,
        verifiedUnitsCount: verifiedUnits,
    });
});

// ─── SCAN QR / RECEIVE MATERIALS PER SURAT JALAN / BPB (Section 9.1) ───
router.post("/branch/receive", requireAuth, requireRole("CABANG", "ADMIN"), async (req, res): Promise<void> => {
    const { qrToken, idempotencyKey } = req.body;
    if (!qrToken) { res.status(400).json({ error: "QR token atau nomor Surat Jalan wajib diisi" }); return; }

    const cleanToken = String(qrToken).trim();
    const isNum = !isNaN(parseInt(cleanToken));

    // Find transaction by QR token, referenceNo, QR-referenceNo, or ID
    const [transaction] = await db.select().from(stockOutTable)
        .where(or(
            eq(stockOutTable.qrToken, cleanToken),
            eq(stockOutTable.referenceNo, cleanToken),
            eq(stockOutTable.referenceNo, cleanToken.replace(/^QR-/, "")),
            ...(isNum ? [eq(stockOutTable.id, parseInt(cleanToken))] : [])
        ));

    if (!transaction) {
        res.status(404).json({ error: `Surat Jalan / BPB dengan kode "${cleanToken}" tidak ditemukan` });
        return;
    }

    // Validate branch matches (ADMIN can act for destination branch)
    const userBranchId = req.session.branchId ?? (req.session.userRole === "ADMIN" ? transaction.destinationBranchId : null);
    if (!userBranchId || (req.session.userRole !== "ADMIN" && transaction.destinationBranchId !== userBranchId)) {
        res.status(403).json({ error: "Cabang Anda tidak sesuai dengan tujuan pengiriman Surat Jalan ini" });
        return;
    }

    // Check if already received
    const [existingReceipt] = await db.select().from(materialReceiptsTable)
        .where(and(
            eq(materialReceiptsTable.transactionId, transaction.id),
            eq(materialReceiptsTable.branchId, userBranchId)
        ));
    if (existingReceipt) {
        res.status(400).json({
            error: `Surat Jalan ${transaction.referenceNo} sudah pernah diterima sebelumnya!`,
            alreadyReceived: true,
            receipt: existingReceipt,
        });
        return;
    }

    const now = new Date();

    // Process receipt in transaction
    await db.transaction(async (tx) => {
        // Create receipt record
        const [receipt] = await tx.insert(materialReceiptsTable).values({
            transactionId: transaction.id,
            qrToken: transaction.qrToken || cleanToken,
            receivedBy: req.session.userId!,
            branchId: userBranchId,
            idempotencyKey: idempotencyKey ?? null,
        }).returning();

        // Update items table receivedAt & receivedBy
        await tx.update(stockOutItemsTable).set({
            receivedAt: now,
            receivedBy: req.session.userId,
        }).where(eq(stockOutItemsTable.stockOutId, transaction.id));

        // Update all material tracking records for this transaction to DITERIMA_CABANG
        const trackedItems = await tx.select({
            trackingId: materialTrackingTable.id,
            trackingUuid: materialTrackingTable.uuid,
            status: materialTrackingTable.status,
            itemId: stockOutItemsTable.itemId,
            itemName: itemsTable.name,
        }).from(materialTrackingTable)
            .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
            .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
            .where(and(
                eq(stockOutItemsTable.stockOutId, transaction.id),
                eq(materialTrackingTable.status, "MENUNGGU_DITERIMA")
            ));

        for (const item of trackedItems) {
            await tx.update(materialTrackingTable).set({
                status: "DITERIMA_CABANG",
                receivedAt: now,
                receivedBy: req.session.userId,
            }).where(eq(materialTrackingTable.id, item.trackingId));

            // Record event
            await tx.insert(materialTrackingEventsTable).values({
                trackingId: item.trackingId,
                eventType: "BRANCH_RECEIVED",
                userId: req.session.userId,
                metadata: { receiptId: receipt.id, qrToken: cleanToken, itemName: item.itemName },
            });
        }

        // Fetch items breakdown with quantities
        const items = await tx.select({
            id: stockOutItemsTable.id,
            itemId: stockOutItemsTable.itemId,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
            quantity: stockOutItemsTable.quantity,
        })
        .from(stockOutItemsTable)
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .where(eq(stockOutItemsTable.stockOutId, transaction.id));

        const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

        res.status(200).json({
            message: `Seluruh material pada Surat Jalan ${transaction.referenceNo} (${totalQty} unit) berhasil diterima di cabang!`,
            receipt,
            referenceNo: transaction.referenceNo,
            totalItems: items.length,
            totalQuantity: totalQty,
            items,
        });
    });
});

// ─── CREATE INSTALLATION ALLOCATION (Section 12) ───
router.post("/branch/allocations", requireAuth, requireRole("CABANG", "ADMIN"), async (req, res): Promise<void> => {
    const { trackingUuid, quantity, plannedLatitude, plannedLongitude } = req.body;
    const resolvedQty = parseInt(String(quantity));
    if (!trackingUuid || !resolvedQty || resolvedQty <= 0) {
        res.status(400).json({ error: "trackingUuid dan quantity valid wajib diisi" }); return;
    }

    const [tracking] = await db.select().from(materialTrackingTable)
        .where(eq(materialTrackingTable.uuid, trackingUuid));
    if (!tracking) { res.status(404).json({ error: "Tracking tidak ditemukan" }); return; }

    // Check branch access (ADMIN allowed)
    if (req.session.userRole !== "ADMIN" && req.session.branchId && tracking.branchId !== req.session.branchId) {
        res.status(403).json({ error: "Forbidden" }); return;
    }

    // Must be in appropriate status
    if (!["DITERIMA_CABANG", "MENUNGGU_PEMASANGAN"].includes(tracking.status)) {
        res.status(400).json({ error: "Status tracking tidak memungkinkan alokasi baru" }); return;
    }

    // Get total quantity for this tracking item
    const [txItem] = await db.select({ quantity: stockOutItemsTable.quantity })
        .from(stockOutItemsTable)
        .where(eq(stockOutItemsTable.id, tracking.transactionItemId));
    const totalQty = txItem?.quantity ?? 0;

    // Race condition protection (Section 27) — use transaction + row lock
    try {
        const result = await db.transaction(async (tx) => {
            // Lock tracking row to prevent concurrent over-allocation
            await tx.select({ id: materialTrackingTable.id })
                .from(materialTrackingTable)
                .where(eq(materialTrackingTable.id, tracking.id))
                .for("update");

            const existingAllocs = await tx.select({
                total: sql<number>`COALESCE(SUM(${installationAllocationsTable.quantity}), 0)`
            }).from(installationAllocationsTable)
                .where(eq(installationAllocationsTable.trackingId, tracking.id));

            const currentAllocated = Number(existingAllocs[0]?.total ?? 0);
            if (currentAllocated + resolvedQty > totalQty) {
                throw new Error(`Alokasi melebihi quantity. Total: ${totalQty}, sudah dialokasi: ${currentAllocated}, diminta: ${resolvedQty}`);
            }

            const [allocation] = await tx.insert(installationAllocationsTable).values({
                trackingId: tracking.id,
                quantity: resolvedQty,
                plannedLatitude: plannedLatitude != null ? String(plannedLatitude) : null,
                plannedLongitude: plannedLongitude != null ? String(plannedLongitude) : null,
                createdBy: req.session.userId,
            }).returning();

            // Update tracking status if first allocation
            if (tracking.status === "DITERIMA_CABANG") {
                await tx.update(materialTrackingTable).set({
                    status: "MENUNGGU_PEMASANGAN",
                }).where(eq(materialTrackingTable.id, tracking.id));
            }

            await tx.insert(materialTrackingEventsTable).values({
                trackingId: tracking.id,
                eventType: "ALLOCATION_CREATED",
                userId: req.session.userId,
                metadata: {
                    allocationId: allocation.id,
                    quantity: resolvedQty,
                    plannedLatitude,
                    plannedLongitude,
                },
            });

            return allocation;
        });

        res.status(201).json(result);
    } catch (err: any) {
        if (err.message?.includes("Alokasi melebihi")) {
            res.status(400).json({ error: err.message }); return;
        }
        throw err;
    }
});

// ─── SUBMIT INSTALLATION EVIDENCE (Section 9.2, 9.3, 10, 13) ───
// Supports DUAL PHOTOS: Before & After installation
router.post("/branch/evidence", requireAuth, requireRole("CABANG", "ADMIN"), async (req, res): Promise<void> => {
    const {
        allocationId, photoBase64, photoBeforeBase64, latitude, longitude, gpsAccuracy,
        clientCaptureTime, idempotencyKey
    } = req.body;

    if (!allocationId || !photoBase64 || latitude == null || longitude == null) {
        res.status(400).json({ error: "allocationId, foto bukti, latitude, longitude wajib diisi" }); return;
    }

    // Idempotency check
    if (idempotencyKey) {
        const [existing] = await db.select().from(installationEvidenceTable)
            .where(eq(installationEvidenceTable.idempotencyKey, idempotencyKey));
        if (existing) {
            res.json({ message: "Evidence sudah tercatat (idempotent)", evidence: existing });
            return;
        }
    }

    // Get allocation
    const [allocation] = await db.select().from(installationAllocationsTable)
        .where(eq(installationAllocationsTable.id, parseInt(String(allocationId))));
    if (!allocation) { res.status(404).json({ error: "Alokasi tidak ditemukan" }); return; }

    // Get tracking
    const [tracking] = await db.select().from(materialTrackingTable)
        .where(eq(materialTrackingTable.id, allocation.trackingId));
    if (!tracking) { res.status(404).json({ error: "Tracking tidak ditemukan" }); return; }

    // Check branch access (ADMIN allowed)
    if (req.session.userRole !== "ADMIN" && req.session.branchId && tracking.branchId !== req.session.branchId) {
        res.status(403).json({ error: "Forbidden" }); return;
    }

    // Calculate checksums (Section 25)
    const photoChecksum = crypto.createHash("sha256").update(photoBase64).digest("hex");
    const photoBeforeChecksum = photoBeforeBase64
        ? crypto.createHash("sha256").update(photoBeforeBase64).digest("hex")
        : null;

    // Get attempt number
    const [attemptCount] = await db.select({
        count: sql<number>`count(*)`
    }).from(installationEvidenceTable)
        .where(eq(installationEvidenceTable.allocationId, allocation.id));
    const attemptNumber = Number(attemptCount?.count ?? 0) + 1;

    // Location mismatch calculation (Section 15)
    let locationMismatch = false;
    let locationDeviationMeters = null;
    if (allocation.plannedLatitude && allocation.plannedLongitude) {
        const lat1 = parseFloat(String(allocation.plannedLatitude));
        const lon1 = parseFloat(String(allocation.plannedLongitude));
        const lat2 = parseFloat(String(latitude));
        const lon2 = parseFloat(String(longitude));
        locationDeviationMeters = haversineDistance(lat1, lon1, lat2, lon2);
        locationMismatch = locationDeviationMeters > MISMATCH_THRESHOLD_METERS;
    }

    // Get Branch Name for Cross-District Verification
    const [branchRow] = await db.select({ name: branchesTable.name })
        .from(branchesTable)
        .where(eq(branchesTable.id, tracking.branchId));
    const branchName = branchRow?.name || "Cabang";

    // Anti-Fraud: Silent Cross-District Detection (Kecamatan)
    const districtAudit = auditCrossDistrictEvidence(
        branchName,
        parseFloat(String(latitude)),
        parseFloat(String(longitude))
    );

    const [evidence] = await db.insert(installationEvidenceTable).values({
        allocationId: allocation.id,
        trackingId: tracking.id,
        attemptNumber,
        photoUrl: photoBase64, // backward compatible
        originalPhotoUrl: photoBase64,
        photoChecksum,
        photoBeforeUrl: photoBeforeBase64 || null,
        photoAfterUrl: photoBase64,
        photoBeforeChecksum,
        latitude: String(latitude),
        longitude: String(longitude),
        gpsAccuracy: gpsAccuracy ? String(gpsAccuracy) : null,
        clientCaptureTime: clientCaptureTime ? new Date(clientCaptureTime) : null,
        capturedBy: req.session.userId!,
        branchId: tracking.branchId,
        locationMismatch,
        locationDeviationMeters: locationDeviationMeters !== null ? String(locationDeviationMeters) : null,
        mismatchThresholdMeters: String(MISMATCH_THRESHOLD_METERS),
        detectedDistrict: districtAudit.detectedDistrict,
        targetDistrict: districtAudit.targetDistrict,
        isCrossDistrict: districtAudit.isCrossDistrict,
        crossDistrictNotes: districtAudit.notes,
        idempotencyKey: idempotencyKey ?? null,
    }).returning();

    // Update tracking status with exact photo installation time
    await db.update(materialTrackingTable).set({
        status: "MENUNGGU_VERIFIKASI",
        installedAt: clientCaptureTime ? new Date(clientCaptureTime) : new Date(),
        installedBy: req.session.userId,
    }).where(eq(materialTrackingTable.id, tracking.id));

    // Record events
    await db.insert(materialTrackingEventsTable).values({
        trackingId: tracking.id,
        eventType: "INSTALLATION_COMPLETED",
        userId: req.session.userId,
        metadata: {
            evidenceId: evidence.id,
            allocationId: allocation.id,
            latitude,
            longitude,
            locationMismatch,
            locationDeviationMeters,
            isCrossDistrict: districtAudit.isCrossDistrict,
            detectedDistrict: districtAudit.detectedDistrict,
            targetDistrict: districtAudit.targetDistrict,
        },
    });

    if (locationMismatch) {
        await db.insert(materialTrackingEventsTable).values({
            trackingId: tracking.id,
            eventType: "LOCATION_MISMATCH_FLAGGED",
            userId: req.session.userId,
            metadata: { deviationMeters: locationDeviationMeters, threshold: MISMATCH_THRESHOLD_METERS },
        });
    }

    if (districtAudit.isCrossDistrict) {
        await db.insert(materialTrackingEventsTable).values({
            trackingId: tracking.id,
            eventType: "CROSS_DISTRICT_ANOMALY_DETECTED",
            userId: req.session.userId,
            metadata: {
                detectedDistrict: districtAudit.detectedDistrict,
                targetDistrict: districtAudit.targetDistrict,
                distanceToTargetKm: districtAudit.distanceToTargetKm,
                notes: districtAudit.notes,
            },
        });
    }

    res.status(201).json(evidence);
});

// ─── LIST MY ALLOCATIONS (for CABANG) ───
router.get("/branch/my-allocations", requireAuth, requireRole("CABANG", "ADMIN"), async (req, res): Promise<void> => {
    let branchId = req.session.branchId;
    if (!branchId && req.session.userRole === "ADMIN") {
        if (req.query.branchId) branchId = parseInt(req.query.branchId as string);
    }

    let query = db
        .select({
            allocationId: installationAllocationsTable.id,
            allocationUuid: installationAllocationsTable.uuid,
            quantity: installationAllocationsTable.quantity,
            plannedLatitude: installationAllocationsTable.plannedLatitude,
            plannedLongitude: installationAllocationsTable.plannedLongitude,
            status: installationAllocationsTable.status,
            createdAt: installationAllocationsTable.createdAt,
            trackingId: materialTrackingTable.id,
            trackingUuid: materialTrackingTable.uuid,
            trackingStatus: materialTrackingTable.status,
            branchId: materialTrackingTable.branchId,
            branchName: branchesTable.name,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
            referenceNo: stockOutTable.referenceNo,
        })
        .from(installationAllocationsTable)
        .innerJoin(materialTrackingTable, eq(installationAllocationsTable.trackingId, materialTrackingTable.id))
        .innerJoin(branchesTable, eq(materialTrackingTable.branchId, branchesTable.id))
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id));

    if (branchId) {
        query = query.where(eq(materialTrackingTable.branchId, branchId)) as any;
    }

    const rows = await (query as any).orderBy(desc(installationAllocationsTable.createdAt));

    res.json({ data: rows });
});

/**
 * Haversine distance in meters between two lat/lon points
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default router;
