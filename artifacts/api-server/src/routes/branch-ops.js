// @ts-nocheck
/**
 * Branch Operations API — QR receipt, installation allocations, evidence submission.
 *
 * Blueprint Sections: 9 (Cabang), 12 (Allocation), 13 (Evidence→Allocation),
 * 26 (Idempotency), 27 (Race Condition)
 */
import { Router } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "crypto";
import { db, stockOutTable, stockOutItemsTable, itemsTable, materialTrackingTable, materialReceiptsTable, materialTrackingEventsTable, installationAllocationsTable, installationEvidenceTable, } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";
const router = Router();
const SLA_DAYS = 7;
const MISMATCH_THRESHOLD_METERS = 100; // configurable
// ─── SCAN QR / RECEIVE MATERIALS (Section 9.1) ───
router.post("/branch/receive", requireAuth, requireRole("CABANG"), async (req, res) => {
    const { qrToken, idempotencyKey } = req.body;
    if (!qrToken) {
        res.status(400).json({ error: "QR token wajib" });
        return;
    }
    // Idempotency check (Section 26)
    if (idempotencyKey) {
        const [existing] = await db.select().from(materialReceiptsTable)
            .where(eq(materialReceiptsTable.idempotencyKey, idempotencyKey));
        if (existing) {
            res.json({ message: "Penerimaan sudah tercatat (idempotent)", receipt: existing });
            return;
        }
    }
    // Find transaction by QR token
    const [transaction] = await db.select().from(stockOutTable)
        .where(eq(stockOutTable.qrToken, qrToken));
    if (!transaction) {
        res.status(404).json({ error: "QR token tidak valid" });
        return;
    }
    if (transaction.status !== "DIKIRIM") {
        res.status(400).json({ error: "Transaksi tidak dalam status DIKIRIM" });
        return;
    }
    // Validate branch matches
    const userBranchId = req.session.branchId;
    if (!userBranchId || transaction.destinationBranchId !== userBranchId) {
        res.status(403).json({ error: "Cabang tidak sesuai dengan tujuan transaksi" });
        return;
    }
    // Check if already received
    const [existingReceipt] = await db.select().from(materialReceiptsTable)
        .where(and(eq(materialReceiptsTable.transactionId, transaction.id), eq(materialReceiptsTable.branchId, userBranchId)));
    if (existingReceipt) {
        res.status(400).json({ error: "Transaksi sudah diterima" });
        return;
    }
    // Process receipt in transaction
    await db.transaction(async (tx) => {
        // Create receipt
        const [receipt] = await tx.insert(materialReceiptsTable).values({
            transactionId: transaction.id,
            qrToken,
            receivedBy: req.session.userId,
            branchId: userBranchId,
            idempotencyKey: idempotencyKey ?? null,
        }).returning();
        // Update all TRACKED material tracking records for this transaction
        const trackedItems = await tx.select({
            trackingId: materialTrackingTable.id,
        }).from(materialTrackingTable)
            .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
            .where(and(eq(stockOutItemsTable.stockOutId, transaction.id), eq(materialTrackingTable.status, "MENUNGGU_DITERIMA")));
        for (const { trackingId } of trackedItems) {
            await tx.update(materialTrackingTable).set({
                status: "DITERIMA_CABANG",
                receivedAt: new Date(),
                receivedBy: req.session.userId,
            }).where(eq(materialTrackingTable.id, trackingId));
            // Record event
            await tx.insert(materialTrackingEventsTable).values({
                trackingId,
                eventType: "BRANCH_RECEIVED",
                userId: req.session.userId,
                metadata: { receiptId: receipt.id, qrToken },
            });
        }
        res.status(201).json({ message: "Barang berhasil diterima", receipt });
    });
});
// ─── CREATE INSTALLATION ALLOCATION (Section 12) ───
router.post("/branch/allocations", requireAuth, requireRole("CABANG"), async (req, res) => {
    const { trackingUuid, quantity, plannedLatitude, plannedLongitude } = req.body;
    if (!trackingUuid || !quantity || quantity <= 0) {
        res.status(400).json({ error: "trackingUuid dan quantity wajib" });
        return;
    }
    const [tracking] = await db.select().from(materialTrackingTable)
        .where(eq(materialTrackingTable.uuid, trackingUuid));
    if (!tracking) {
        res.status(404).json({ error: "Tracking tidak ditemukan" });
        return;
    }
    // Check branch access
    if (req.session.branchId && tracking.branchId !== req.session.branchId) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    // Must be in appropriate status
    if (!["DITERIMA_CABANG", "MENUNGGU_PEMASANGAN"].includes(tracking.status)) {
        res.status(400).json({ error: "Status tracking tidak memungkinkan alokasi baru" });
        return;
    }
    // Get total quantity for this tracking item
    const [txItem] = await db.select({ quantity: stockOutItemsTable.quantity })
        .from(stockOutItemsTable)
        .where(eq(stockOutItemsTable.id, tracking.transactionItemId));
    const totalQty = txItem?.quantity ?? 0;
    // Race condition protection (Section 27) — use transaction + row lock
    try {
        const result = await db.transaction(async (tx) => {
            // Lock existing allocations to prevent concurrent over-allocation
            const existingAllocs = await tx.select({
                total: sql `COALESCE(SUM(${installationAllocationsTable.quantity}), 0)`
            }).from(installationAllocationsTable)
                .where(eq(installationAllocationsTable.trackingId, tracking.id))
                .for("update");
            const currentAllocated = Number(existingAllocs[0]?.total ?? 0);
            if (currentAllocated + quantity > totalQty) {
                throw new Error(`Alokasi melebihi quantity. Total: ${totalQty}, sudah dialokasi: ${currentAllocated}, diminta: ${quantity}`);
            }
            const [allocation] = await tx.insert(installationAllocationsTable).values({
                trackingId: tracking.id,
                quantity,
                plannedLatitude: plannedLatitude ?? null,
                plannedLongitude: plannedLongitude ?? null,
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
                metadata: { allocationId: allocation.id, quantity, plannedLatitude, plannedLongitude },
            });
            return allocation;
        });
        res.status(201).json(result);
    }
    catch (err) {
        if (err.message?.includes("Alokasi melebihi")) {
            res.status(400).json({ error: err.message });
            return;
        }
        throw err;
    }
});
// ─── SUBMIT INSTALLATION EVIDENCE (Section 9.2, 9.3, 10, 13) ───
router.post("/branch/evidence", requireAuth, requireRole("CABANG"), async (req, res) => {
    const { allocationId, photoBase64, latitude, longitude, gpsAccuracy, clientCaptureTime, idempotencyKey } = req.body;
    if (!allocationId || !photoBase64 || !latitude || !longitude) {
        res.status(400).json({ error: "allocationId, photo, latitude, longitude wajib" });
        return;
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
        .where(eq(installationAllocationsTable.id, allocationId));
    if (!allocation) {
        res.status(404).json({ error: "Alokasi tidak ditemukan" });
        return;
    }
    // Get tracking
    const [tracking] = await db.select().from(materialTrackingTable)
        .where(eq(materialTrackingTable.id, allocation.trackingId));
    if (!tracking) {
        res.status(404).json({ error: "Tracking tidak ditemukan" });
        return;
    }
    // Check branch access
    if (req.session.branchId && tracking.branchId !== req.session.branchId) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    // Calculate checksum (Section 25)
    const photoChecksum = crypto.createHash("sha256").update(photoBase64).digest("hex");
    // Get attempt number
    const [attemptCount] = await db.select({
        count: sql `count(*)`
    }).from(installationEvidenceTable)
        .where(eq(installationEvidenceTable.allocationId, allocationId));
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
    // Store photo as URL (in production, upload to storage; for now, save path)
    // TODO: Replace with actual file storage (S3/blob)
    const photoUrl = `/evidence/${photoChecksum}_watermarked.webp`;
    const originalPhotoUrl = `/evidence/${photoChecksum}_original.webp`;
    const [evidence] = await db.insert(installationEvidenceTable).values({
        allocationId,
        trackingId: tracking.id,
        attemptNumber,
        photoUrl,
        originalPhotoUrl,
        photoChecksum,
        latitude: String(latitude),
        longitude: String(longitude),
        gpsAccuracy: gpsAccuracy ? String(gpsAccuracy) : null,
        clientCaptureTime: clientCaptureTime ? new Date(clientCaptureTime) : null,
        capturedBy: req.session.userId,
        branchId: tracking.branchId,
        locationMismatch,
        locationDeviationMeters: locationDeviationMeters !== null ? String(locationDeviationMeters) : null,
        mismatchThresholdMeters: String(MISMATCH_THRESHOLD_METERS),
        idempotencyKey: idempotencyKey ?? null,
    }).returning();
    // Update tracking status
    await db.update(materialTrackingTable).set({
        status: "MENUNGGU_VERIFIKASI",
    }).where(eq(materialTrackingTable.id, tracking.id));
    // Record events
    await db.insert(materialTrackingEventsTable).values({
        trackingId: tracking.id,
        eventType: "INSTALLATION_COMPLETED",
        userId: req.session.userId,
        metadata: {
            evidenceId: evidence.id,
            allocationId,
            latitude,
            longitude,
            locationMismatch,
            locationDeviationMeters,
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
    res.status(201).json(evidence);
});
// ─── LIST MY ALLOCATIONS (for CABANG) ───
router.get("/branch/my-allocations", requireAuth, requireRole("CABANG"), async (req, res) => {
    const branchId = req.session.branchId;
    if (!branchId) {
        res.status(400).json({ error: "Branch tidak terkonfigurasi" });
        return;
    }
    const rows = await db
        .select({
        allocationId: installationAllocationsTable.id,
        allocationUuid: installationAllocationsTable.uuid,
        quantity: installationAllocationsTable.quantity,
        status: installationAllocationsTable.status,
        trackingId: materialTrackingTable.id,
        trackingUuid: materialTrackingTable.uuid,
        trackingStatus: materialTrackingTable.status,
        itemName: itemsTable.name,
        itemCode: itemsTable.code,
        referenceNo: stockOutTable.referenceNo,
    })
        .from(installationAllocationsTable)
        .innerJoin(materialTrackingTable, eq(installationAllocationsTable.trackingId, materialTrackingTable.id))
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
        .where(eq(materialTrackingTable.branchId, branchId))
        .orderBy(desc(installationAllocationsTable.createdAt));
    res.json({ data: rows });
});
/**
 * Haversine distance in meters between two lat/lon points
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
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
