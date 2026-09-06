// @ts-nocheck
/**
 * SPI Verification & GIS API (Sections 14, 16, 17, 34, 35, 36)
 */
import { Router, type IRouter } from "express";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
    db,
    materialTrackingTable,
    materialTrackingEventsTable,
    materialVerificationsTable,
    installationAllocationsTable,
    installationEvidenceTable,
    stockOutTable,
    stockOutItemsTable,
    itemsTable,
    branchesTable,
    usersTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

// ─── SPI DASHBOARD DATA (Section 32) ───
router.get("/spi/dashboard", requireAuth, requireRole("SPI", "ADMIN"), async (req, res): Promise<void> => {
    const statusCounts = await db
        .select({
            status: materialTrackingTable.status,
            count: sql<number>`count(*)`,
        })
        .from(materialTrackingTable)
        .groupBy(materialTrackingTable.status);

    const statusMap: Record<string, number> = {};
    statusCounts.forEach(r => { statusMap[r.status] = Number(r.count); });

    // Overdue count (SLA passed, not verified)
    const [overdueResult] = await db.select({
        count: sql<number>`count(*)`
    }).from(materialTrackingTable)
        .where(and(
            sql`${materialTrackingTable.slaDeadlineAt} < NOW()`,
            sql`${materialTrackingTable.status} NOT IN ('TERVERIFIKASI')`
        ));

    // Location mismatch count
    const [mismatchResult] = await db.select({
        count: sql<number>`count(*)`
    }).from(installationEvidenceTable)
        .where(eq(installationEvidenceTable.locationMismatch, true));

    // Partial installation count
    const partialQuery = await db
        .select({
            trackingId: materialTrackingTable.id,
            totalQty: stockOutItemsTable.quantity,
            allocatedQty: sql<number>`COALESCE((
        SELECT SUM(ia.quantity) FROM installation_allocations ia WHERE ia.tracking_id = ${materialTrackingTable.id}
      ), 0)`,
        })
        .from(materialTrackingTable)
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .where(eq(materialTrackingTable.status, "MENUNGGU_PEMASANGAN"));

    const partialCount = partialQuery.filter(r => {
        const allocated = Number(r.allocatedQty);
        return allocated > 0 && allocated < r.totalQty;
    }).length;

    // Branch performance
    const branchPerformance = await db
        .select({
            branchId: materialTrackingTable.branchId,
            branchName: branchesTable.name,
            total: sql<number>`count(*)`,
            verified: sql<number>`count(*) FILTER (WHERE ${materialTrackingTable.status} = 'TERVERIFIKASI')`,
            overdue: sql<number>`count(*) FILTER (WHERE ${materialTrackingTable.slaDeadlineAt} < NOW() AND ${materialTrackingTable.status} NOT IN ('TERVERIFIKASI'))`,
        })
        .from(materialTrackingTable)
        .leftJoin(branchesTable, eq(materialTrackingTable.branchId, branchesTable.id))
        .groupBy(materialTrackingTable.branchId, branchesTable.name);

    res.json({
        cards: {
            totalTracked: Object.values(statusMap).reduce((a, b) => a + b, 0),
            menungguDiterima: statusMap["MENUNGGU_DITERIMA"] ?? 0,
            diterimaCabang: statusMap["DITERIMA_CABANG"] ?? 0,
            menungguPemasangan: statusMap["MENUNGGU_PEMASANGAN"] ?? 0,
            terpasangSebagian: partialCount,
            terpasang: statusMap["TERPASANG"] ?? 0,
            menungguVerifikasi: statusMap["MENUNGGU_VERIFIKASI"] ?? 0,
            terverifikasi: statusMap["TERVERIFIKASI"] ?? 0,
            overdue: Number(overdueResult?.count ?? 0),
            locationMismatch: Number(mismatchResult?.count ?? 0),
        },
        branchPerformance,
    });
});

// ─── LAPORAN AUDIT & VERIFIKASI SPI ───
router.get("/spi/reports/audit", requireAuth, requireRole("SPI", "ADMIN"), async (req, res): Promise<void> => {
    const { branchId, month, year, search, anomalyStatus, auditStatus } = req.query;

    const baseQuery = db
        .select({
            evidenceId: installationEvidenceTable.id,
            evidenceUuid: installationEvidenceTable.uuid,
            referenceNo: stockOutTable.referenceNo,
            branchName: branchesTable.name,
            branchId: branchesTable.id,
            latitude: installationEvidenceTable.latitude,
            longitude: installationEvidenceTable.longitude,
            detectedDistrict: installationEvidenceTable.detectedDistrict,
            targetDistrict: installationEvidenceTable.targetDistrict,
            isCrossDistrict: installationEvidenceTable.isCrossDistrict,
            locationDeviationMeters: installationEvidenceTable.locationDeviationMeters,
            evidenceStatus: installationEvidenceTable.status, // PENDING | TERVERIFIKASI | DITOLAK
            createdAt: installationEvidenceTable.createdAt,
            
            itemName: itemsTable.name,
            quantity: installationAllocationsTable.quantity,
            
            // From verification table
            verificationStatus: materialVerificationsTable.status,
            verificationNotes: materialVerificationsTable.notes,
            verifiedAt: materialVerificationsTable.verifiedAt,
            auditorName: usersTable.fullName,
        })
        .from(installationEvidenceTable)
        .innerJoin(materialTrackingTable, eq(installationEvidenceTable.trackingId, materialTrackingTable.id))
        .innerJoin(branchesTable, eq(installationEvidenceTable.branchId, branchesTable.id))
        .innerJoin(installationAllocationsTable, eq(installationEvidenceTable.allocationId, installationAllocationsTable.id))
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        // Left join verifications, because some might be PENDING
        .leftJoin(materialVerificationsTable, eq(installationEvidenceTable.id, materialVerificationsTable.evidenceId))
        .leftJoin(usersTable, eq(materialVerificationsTable.verifiedBy, usersTable.id))
        .orderBy(desc(installationEvidenceTable.createdAt));

    const rows = await baseQuery;

    // Filter in-memory (cleaner for complex combined conditions)
    const filteredRows = rows.filter((row) => {
        // 1. Branch filter
        if (branchId && branchId !== "all" && String(row.branchId) !== String(branchId)) return false;
        
        // 2. Month filter
        if (month && month !== "all") {
            const m = new Date(row.createdAt).getMonth() + 1;
            if (m !== parseInt(String(month))) return false;
        }

        // 3. Year filter
        if (year && year !== "all") {
            const y = new Date(row.createdAt).getFullYear();
            if (y !== parseInt(String(year))) return false;
        }

        // 4. Search filter (Item Name or Reference No)
        if (search && String(search).trim() !== "") {
            const s = String(search).toLowerCase();
            const match = row.referenceNo.toLowerCase().includes(s) || row.itemName.toLowerCase().includes(s);
            if (!match) return false;
        }

        // 5. Audit Status filter
        if (auditStatus && auditStatus !== "all") {
            if (auditStatus === "TERVERIFIKASI" && row.evidenceStatus !== "TERVERIFIKASI") return false;
            if (auditStatus === "DITOLAK" && row.evidenceStatus !== "DITOLAK") return false;
            if (auditStatus === "PENDING" && row.evidenceStatus !== "PENDING") return false;
        }

        // 6. Anomaly Status filter
        if (anomalyStatus && anomalyStatus !== "all") {
            const isCross = row.isCrossDistrict;
            const isDeviation = row.locationDeviationMeters && parseFloat(row.locationDeviationMeters) > 50; // threshold > 50m
            const isValid = !isCross && !isDeviation;

            if (anomalyStatus === "ZONA_VALID" && !isValid) return false;
            if (anomalyStatus === "LINTAS_WILAYAH" && !isCross) return false;
            if (anomalyStatus === "DEVIASI_TINGGI" && !isDeviation) return false;
            if (anomalyStatus === "ANOMALI" && isValid) return false; // Any anomaly
        }

        return true;
    });

    res.json({ data: filteredRows });
});

// ─── LIST PENDING VERIFICATIONS ───
router.get("/spi/pending", requireAuth, requireRole("SPI", "ADMIN"), async (req, res): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(installationEvidenceTable)
        .where(eq(installationEvidenceTable.status, "PENDING"));

    const rows = await db
        .select({
            evidenceId: installationEvidenceTable.id,
            evidenceUuid: installationEvidenceTable.uuid,
            photoUrl: installationEvidenceTable.photoUrl,
            photoBeforeUrl: installationEvidenceTable.photoBeforeUrl,
            photoAfterUrl: installationEvidenceTable.photoAfterUrl,
            photoChecksum: installationEvidenceTable.photoChecksum,
            photoBeforeChecksum: installationEvidenceTable.photoBeforeChecksum,
            latitude: installationEvidenceTable.latitude,
            longitude: installationEvidenceTable.longitude,
            gpsAccuracy: installationEvidenceTable.gpsAccuracy,
            locationMismatch: installationEvidenceTable.locationMismatch,
            locationDeviationMeters: installationEvidenceTable.locationDeviationMeters,
            detectedDistrict: installationEvidenceTable.detectedDistrict,
            targetDistrict: installationEvidenceTable.targetDistrict,
            isCrossDistrict: installationEvidenceTable.isCrossDistrict,
            crossDistrictNotes: installationEvidenceTable.crossDistrictNotes,
            allocationQuantity: installationAllocationsTable.quantity,
            plannedLatitude: installationAllocationsTable.plannedLatitude,
            plannedLongitude: installationAllocationsTable.plannedLongitude,
            trackingUuid: materialTrackingTable.uuid,
            trackingStatus: materialTrackingTable.status,
            branchName: branchesTable.name,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
            referenceNo: stockOutTable.referenceNo,
            createdAt: installationEvidenceTable.createdAt,
        })
        .from(installationEvidenceTable)
        .innerJoin(installationAllocationsTable, eq(installationEvidenceTable.allocationId, installationAllocationsTable.id))
        .innerJoin(materialTrackingTable, eq(installationEvidenceTable.trackingId, materialTrackingTable.id))
        .innerJoin(branchesTable, eq(installationEvidenceTable.branchId, branchesTable.id))
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
        .where(eq(installationEvidenceTable.status, "PENDING"))
        .orderBy(installationEvidenceTable.createdAt)
        .limit(limit)
        .offset(offset);

    res.json({ data: rows, pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) } });
});

// ─── VERIFY EVIDENCE (Section 34, 35) ───
router.post("/spi/verify/:evidenceUuid", requireAuth, requireRole("SPI", "ADMIN"), async (req, res): Promise<void> => {
    const { status, notes } = req.body; // TERVERIFIKASI | DITOLAK
    if (!["TERVERIFIKASI", "DITOLAK"].includes(status)) {
        res.status(400).json({ error: "Status harus TERVERIFIKASI atau DITOLAK" }); return;
    }
    if (status === "DITOLAK" && !notes) {
        res.status(400).json({ error: "Alasan penolakan wajib diisi" }); return;
    }

    const [evidence] = await db.select().from(installationEvidenceTable)
        .where(eq(installationEvidenceTable.uuid, req.params.evidenceUuid));
    if (!evidence) { res.status(404).json({ error: "Evidence tidak ditemukan" }); return; }
    if (evidence.status !== "PENDING") { res.status(400).json({ error: "Evidence sudah diverifikasi/ditolak" }); return; }

    const [tracking] = await db.select().from(materialTrackingTable)
        .where(eq(materialTrackingTable.id, evidence.trackingId));
    if (!tracking) { res.status(404).json({ error: "Tracking tidak ditemukan" }); return; }

    await db.transaction(async (tx) => {
        // Update evidence status
        await tx.update(installationEvidenceTable).set({
            status,
            rejectionReason: status === "DITOLAK" ? notes : null,
        }).where(eq(installationEvidenceTable.id, evidence.id));

        // Create verification record
        const [verification] = await tx.insert(materialVerificationsTable).values({
            trackingId: tracking.id,
            evidenceId: evidence.id,
            verifiedBy: req.session.userId!,
            status,
            notes: notes ?? null,
            // Snapshot of verified location (Section 35)
            verifiedLatitude: status === "TERVERIFIKASI" ? evidence.latitude : null,
            verifiedLongitude: status === "TERVERIFIKASI" ? evidence.longitude : null,
        }).returning();

        // Update tracking status
        if (status === "TERVERIFIKASI") {
            // Check if ALL allocations for this tracking are now verified
            // For now, update tracking status
            await tx.update(materialTrackingTable).set({
                status: "TERVERIFIKASI",
                verifiedAt: new Date(),
                verifiedBy: req.session.userId,
            }).where(eq(materialTrackingTable.id, tracking.id));

            // Update allocation status
            await tx.update(installationAllocationsTable).set({
                status: "VERIFIED",
            }).where(eq(installationAllocationsTable.id, evidence.allocationId));
        } else {
            // DITOLAK — revert to MENUNGGU_PEMASANGAN
            await tx.update(materialTrackingTable).set({
                status: "MENUNGGU_PEMASANGAN",
            }).where(eq(materialTrackingTable.id, tracking.id));

            await tx.update(installationAllocationsTable).set({
                status: "REJECTED",
            }).where(eq(installationAllocationsTable.id, evidence.allocationId));
        }

        // Record event
        await tx.insert(materialTrackingEventsTable).values({
            trackingId: tracking.id,
            eventType: status === "TERVERIFIKASI" ? "VERIFIED" : "REJECTED",
            userId: req.session.userId,
            metadata: {
                evidenceId: evidence.id,
                verificationId: verification.id,
                notes,
            },
        });
    });

    res.json({ message: status === "TERVERIFIKASI" ? "Evidence terverifikasi" : "Evidence ditolak" });
});

// ─── GIS ENDPOINT — VERIFIED EVIDENCE ONLY (Section 16, 36) ───
router.get("/gis/material-locations", async (req, res, next): Promise<void> => {
    // Allow interactive session OR direct QGIS desktop client token
    const isQgisAccess =
        req.query.token === "sigaplek-qgis" ||
        Boolean(req.query.apiKey) ||
        Boolean(req.headers["x-gis-token"]);

    if (!req.session?.userId && !isQgisAccess) {
        return requireAuth(req, res, next);
    }

    // Only return verified evidence locations (Section 16)
    const locations = await db
        .select({
            evidenceId: installationEvidenceTable.id,
            evidenceUuid: installationEvidenceTable.uuid,
            photoUrl: installationEvidenceTable.photoUrl,
            latitude: installationEvidenceTable.latitude,
            longitude: installationEvidenceTable.longitude,
            gpsAccuracy: installationEvidenceTable.gpsAccuracy,
            allocationQuantity: installationAllocationsTable.quantity,
            plannedLatitude: installationAllocationsTable.plannedLatitude,
            plannedLongitude: installationAllocationsTable.plannedLongitude,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
            referenceNo: stockOutTable.referenceNo,
            branchId: branchesTable.id,
            branchName: branchesTable.name,
            verifiedAt: materialVerificationsTable.verifiedAt,
            verifiedLatitude: materialVerificationsTable.verifiedLatitude,
            verifiedLongitude: materialVerificationsTable.verifiedLongitude,
            trackingStatus: materialTrackingTable.status,
            installedAt: materialTrackingTable.installedAt,
            slaDeadlineAt: materialTrackingTable.slaDeadlineAt,
            locationMismatch: installationEvidenceTable.locationMismatch,
            locationDeviationMeters: installationEvidenceTable.locationDeviationMeters,
            detectedDistrict: installationEvidenceTable.detectedDistrict,
            targetDistrict: installationEvidenceTable.targetDistrict,
            isCrossDistrict: installationEvidenceTable.isCrossDistrict,
            crossDistrictNotes: installationEvidenceTable.crossDistrictNotes,
        })
        .from(installationEvidenceTable)
        .innerJoin(installationAllocationsTable, eq(installationEvidenceTable.allocationId, installationAllocationsTable.id))
        .innerJoin(materialTrackingTable, eq(installationEvidenceTable.trackingId, materialTrackingTable.id))
        .innerJoin(branchesTable, eq(materialTrackingTable.branchId, branchesTable.id))
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
        .leftJoin(materialVerificationsTable, and(
            eq(materialVerificationsTable.evidenceId, installationEvidenceTable.id),
            eq(materialVerificationsTable.status, "TERVERIFIKASI")
        ))
        .where(eq(installationEvidenceTable.status, "TERVERIFIKASI"));

    // Convert to GeoJSON FeatureCollection
    const features = locations.map(loc => ({
        type: "Feature" as const,
        geometry: {
            type: "Point" as const,
            coordinates: [parseFloat(String(loc.longitude)), parseFloat(String(loc.latitude))],
        },
        properties: {
            evidenceId: loc.evidenceId,
            evidenceUuid: loc.evidenceUuid,
            photoUrl: loc.photoUrl,
            itemName: loc.itemName,
            itemCode: loc.itemCode,
            quantity: loc.allocationQuantity,
            referenceNo: loc.referenceNo,
            branchId: loc.branchId,
            branchName: loc.branchName,
            verifiedAt: loc.verifiedAt,
            installedAt: loc.installedAt,
            gpsAccuracy: loc.gpsAccuracy ? parseFloat(String(loc.gpsAccuracy)) : null,
            locationMismatch: Boolean(loc.locationMismatch),
            deviationMeters: loc.locationDeviationMeters ? parseFloat(String(loc.locationDeviationMeters)) : null,
            detectedDistrict: loc.detectedDistrict,
            targetDistrict: loc.targetDistrict,
            isCrossDistrict: Boolean(loc.isCrossDistrict),
            crossDistrictNotes: loc.crossDistrictNotes,
            plannedCoordinates: (loc.plannedLongitude && loc.plannedLatitude)
                ? [parseFloat(String(loc.plannedLongitude)), parseFloat(String(loc.plannedLatitude))] as [number, number]
                : null,
        },
    }));

    res.json({
        type: "FeatureCollection",
        features,
    });
});

export default router;
