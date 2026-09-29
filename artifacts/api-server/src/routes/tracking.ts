// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import {
    db,
    materialTrackingTable,
    materialTrackingEventsTable,
    stockOutTable,
    stockOutItemsTable,
    itemsTable,
    branchesTable,
    installationAllocationsTable,
    installationEvidenceTable,
    materialVerificationsTable,
    materialReceiptsTable,
    usersTable,
} from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

/**
 * Configuration constants (Section 18 — SLA configurable)
 */
const SLA_DAYS = 7;

// ─── LIST TRACKING ───
router.get("/tracking", requireAuth, async (req, res): Promise<void> => {
    const { status, branchId, search, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr as string) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(limitStr as string) || 100));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (status) conditions.push(eq(materialTrackingTable.status, status as string));
    if (branchId) conditions.push(eq(materialTrackingTable.branchId, parseInt(branchId as string)));

    // Filter by branch for CABANG users
    if (req.session.userRole === "CABANG" && req.session.branchId) {
        conditions.push(eq(materialTrackingTable.branchId, req.session.branchId));
    }

    if (search && String(search).trim()) {
        const s = `%${String(search).trim()}%`;
        conditions.push(or(
            ilike(itemsTable.name, s),
            ilike(itemsTable.code, s),
            ilike(stockOutTable.referenceNo, s)
        ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(materialTrackingTable)
        .leftJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .leftJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .leftJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
        .where(whereClause);
    const total = Number(count);

    const rows = await db
        .select({
            id: materialTrackingTable.id,
            uuid: materialTrackingTable.uuid,
            status: materialTrackingTable.status,
            branchId: materialTrackingTable.branchId,
            branchName: branchesTable.name,
            transactionItemId: materialTrackingTable.transactionItemId,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
            quantity: stockOutItemsTable.quantity,
            referenceNo: stockOutTable.referenceNo,
            slaStartAt: materialTrackingTable.slaStartAt,
            slaDeadlineAt: materialTrackingTable.slaDeadlineAt,
            receivedAt: materialTrackingTable.receivedAt,
            receivedBy: materialTrackingTable.receivedBy,
            receivedByName: usersTable.fullName,
            receivedByUsername: usersTable.username,
            installedAt: materialTrackingTable.installedAt,
            verifiedAt: materialTrackingTable.verifiedAt,
            createdAt: materialTrackingTable.createdAt,
        })
        .from(materialTrackingTable)
        .leftJoin(branchesTable, eq(materialTrackingTable.branchId, branchesTable.id))
        .leftJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .leftJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .leftJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
        .leftJoin(usersTable, eq(materialTrackingTable.receivedBy, usersTable.id))
        .where(whereClause)
        .orderBy(desc(materialTrackingTable.createdAt))
        .limit(limit)
        .offset(offset);

    // Compute SLA status and installed_quantity for each tracking
    const enriched = await Promise.all(rows.map(async (row) => {
        // Installed quantity (Section 19 — derived, not stored)
        const [allocSum] = await db
            .select({ total: sql<number>`COALESCE(SUM(${installationAllocationsTable.quantity}), 0)` })
            .from(installationAllocationsTable)
            .where(eq(installationAllocationsTable.trackingId, row.id));

        const installedQuantity = Number(allocSum?.total ?? 0);
        const totalQuantity = row.quantity ?? 0;
        const isPartial = installedQuantity > 0 && installedQuantity < totalQuantity;
        const remainingQuantity = totalQuantity - installedQuantity;

        // SLA status (Section 18)
        let slaStatus = "NORMAL";
        if (row.slaDeadlineAt && row.status !== "TERVERIFIKASI") {
            const now = new Date();
            const deadline = new Date(row.slaDeadlineAt);
            const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursLeft <= 0) slaStatus = "OVERDUE";
            else if (hoursLeft <= 24) slaStatus = "KRITIS";
            else if (hoursLeft <= 48) slaStatus = "WARNING";
        }

        return {
            ...row,
            installedQuantity,
            totalQuantity,
            remainingQuantity,
            isPartial,
            slaStatus,
        };
    }));

    res.json({ data: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ─── GET TRACKING DETAIL (Material Journey — Section 33) ───
router.get("/tracking/:uuid", requireAuth, async (req, res): Promise<void> => {
    const trackingUuid = req.params.uuid;

    const [tracking] = await db
        .select({
            id: materialTrackingTable.id,
            uuid: materialTrackingTable.uuid,
            transactionItemId: materialTrackingTable.transactionItemId,
            branchId: materialTrackingTable.branchId,
            status: materialTrackingTable.status,
            slaStartAt: materialTrackingTable.slaStartAt,
            slaDeadlineAt: materialTrackingTable.slaDeadlineAt,
            receivedAt: materialTrackingTable.receivedAt,
            receivedBy: materialTrackingTable.receivedBy,
            receivedByName: usersTable.fullName,
            receivedByUsername: usersTable.username,
            installedAt: materialTrackingTable.installedAt,
            installedBy: materialTrackingTable.installedBy,
            verifiedAt: materialTrackingTable.verifiedAt,
            verifiedBy: materialTrackingTable.verifiedBy,
            createdAt: materialTrackingTable.createdAt,
            updatedAt: materialTrackingTable.updatedAt,
        })
        .from(materialTrackingTable)
        .leftJoin(usersTable, eq(materialTrackingTable.receivedBy, usersTable.id))
        .where(eq(materialTrackingTable.uuid, trackingUuid));

    if (!tracking) { res.status(404).json({ error: "Tracking tidak ditemukan" }); return; }

    // Check branch access for CABANG users
    if (req.session.userRole === "CABANG" && req.session.branchId && tracking.branchId !== req.session.branchId) {
        res.status(403).json({ error: "Forbidden" }); return;
    }

    // Get transaction item details
    const [txItem] = await db
        .select({
            stockOutId: stockOutItemsTable.stockOutId,
            quantity: stockOutItemsTable.quantity,
            itemName: itemsTable.name,
            itemCode: itemsTable.code,
            trackingType: itemsTable.trackingType,
            unit: itemsTable.unitId,
            referenceNo: stockOutTable.referenceNo,
            transactionUuid: stockOutTable.uuid,
            transactionDate: stockOutTable.transactionDate,
            warehouseName: sql<string>`(SELECT name FROM warehouses WHERE id = ${stockOutTable.warehouseId})`,
        })
        .from(stockOutItemsTable)
        .leftJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
        .leftJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
        .where(eq(stockOutItemsTable.id, tracking.transactionItemId));

    // Fallback: If receivedByName is null but transaction had a material_receipts record
    if (!tracking.receivedByName && txItem?.stockOutId) {
        const [receipt] = await db
            .select({
                receivedAt: materialReceiptsTable.receivedAt,
                receivedBy: materialReceiptsTable.receivedBy,
                receivedByName: usersTable.fullName,
                receivedByUsername: usersTable.username,
            })
            .from(materialReceiptsTable)
            .leftJoin(usersTable, eq(materialReceiptsTable.receivedBy, usersTable.id))
            .where(and(
                eq(materialReceiptsTable.transactionId, txItem.stockOutId),
                eq(materialReceiptsTable.branchId, tracking.branchId)
            ));
        if (receipt) {
            tracking.receivedAt = tracking.receivedAt || receipt.receivedAt;
            tracking.receivedBy = tracking.receivedBy || receipt.receivedBy;
            tracking.receivedByName = receipt.receivedByName;
            tracking.receivedByUsername = receipt.receivedByUsername;
        }
    }

    // Get branch
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, tracking.branchId));

    // Get allocations
    const allocations = await db.select().from(installationAllocationsTable)
        .where(eq(installationAllocationsTable.trackingId, tracking.id));

    // Get evidence for each allocation
    const allocationsWithEvidence = await Promise.all(allocations.map(async (alloc) => {
        const evidence = await db.select().from(installationEvidenceTable)
            .where(eq(installationEvidenceTable.allocationId, alloc.id))
            .orderBy(desc(installationEvidenceTable.createdAt));

        const verifications = await db.select().from(materialVerificationsTable)
            .where(eq(materialVerificationsTable.trackingId, tracking.id));

        return { ...alloc, evidence, verifications };
    }));

    // Get events timeline with user actor info
    const events = await db
        .select({
            id: materialTrackingEventsTable.id,
            trackingId: materialTrackingEventsTable.trackingId,
            eventType: materialTrackingEventsTable.eventType,
            userId: materialTrackingEventsTable.userId,
            userName: usersTable.fullName,
            username: usersTable.username,
            eventTime: materialTrackingEventsTable.eventTime,
            metadata: materialTrackingEventsTable.metadata,
        })
        .from(materialTrackingEventsTable)
        .leftJoin(usersTable, eq(materialTrackingEventsTable.userId, usersTable.id))
        .where(eq(materialTrackingEventsTable.trackingId, tracking.id))
        .orderBy(materialTrackingEventsTable.eventTime);

    // Compute installed quantity
    const installedQuantity = allocations.reduce((sum, a) => sum + a.quantity, 0);
    const totalQuantity = txItem?.quantity ?? 0;

    res.json({
        tracking,
        item: txItem,
        transactionItem: txItem,
        branch,
        allocations: allocationsWithEvidence,
        events,
        summary: {
            totalQuantity,
            installedQuantity,
            remainingQuantity: totalQuantity - installedQuantity,
            isPartial: installedQuantity > 0 && installedQuantity < totalQuantity,
        },
    });
});

// ─── GET TRACKING EVENTS (Audit/Timeline) ───
router.get("/tracking/:uuid/events", requireAuth, async (req, res): Promise<void> => {
    const [tracking] = await db.select().from(materialTrackingTable)
        .where(eq(materialTrackingTable.uuid, req.params.uuid));
    if (!tracking) { res.status(404).json({ error: "Tracking tidak ditemukan" }); return; }

    const events = await db
        .select({
            id: materialTrackingEventsTable.id,
            trackingId: materialTrackingEventsTable.trackingId,
            eventType: materialTrackingEventsTable.eventType,
            userId: materialTrackingEventsTable.userId,
            userName: usersTable.fullName,
            username: usersTable.username,
            eventTime: materialTrackingEventsTable.eventTime,
            metadata: materialTrackingEventsTable.metadata,
        })
        .from(materialTrackingEventsTable)
        .leftJoin(usersTable, eq(materialTrackingEventsTable.userId, usersTable.id))
        .where(eq(materialTrackingEventsTable.trackingId, tracking.id))
        .orderBy(materialTrackingEventsTable.eventTime);

    res.json({ data: events });
});

export default router;
