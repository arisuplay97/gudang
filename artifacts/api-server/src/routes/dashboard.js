// @ts-nocheck
import { Router } from "express";
import { eq, sql, gte, and, lt, desc } from "drizzle-orm";
import { db, itemsTable, stockOutTable, auditLogsTable, materialTrackingTable, stockOutItemsTable, installationEvidenceTable, branchesTable, branchStocksTable, } from "@workspace/db";
import { requireAuth } from "../lib/auth";
const router = Router();
const SLA_DAYS = 7;
// GET /dashboard/summary — Ringkasan dashboard pusat
router.get("/dashboard/summary", requireAuth, async (_req, res) => {
    try {
        const allItems = await db.select().from(itemsTable);
        const totalItems = allItems.length;
        // Hitung total nilai & total unit aksesoris yang ada di seluruh cabang
        const branchStockData = await db
            .select({
            quantity: branchStocksTable.quantity,
            unitPrice: itemsTable.unitPrice,
        })
            .from(branchStocksTable)
            .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id));
        const inventoryValue = branchStockData.reduce((sum, i) => sum + (i.quantity * parseFloat(i.unitPrice || 0)), 0);
        const totalBranchStocks = branchStockData.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const stockOutAll = await db.select().from(stockOutTable);
        const isFinalized = (status) => !!status && ["finalized", "completed", "dikirim", "diproses", "selesai", "approved"].includes(status.toLowerCase());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStockOut = stockOutAll.filter(r => r.transactionDate >= today && isFinalized(r.status)).length;
        const pendingOut = stockOutAll.filter(r => r.status === "draft" || r.status === "DRAFT").length;
        const trackedItems = allItems.filter(i => i.trackingType === "TRACKED").length;
        const nonTrackedItems = totalItems - trackedItems;
        res.json({
            totalItems,
            totalStockIn: 0,
            totalStockOut: stockOutAll.filter(r => isFinalized(r.status)).length,
            totalBranchStocks,
            lowStockCount: 0,
            pendingTransactions: pendingOut,
            inventoryValue,
            todayStockIn: 0,
            todayStockOut,
            trackedItems,
            nonTrackedItems,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || "Gagal memuat ringkasan dashboard" });
    }
});
// GET /dashboard/recent-transactions
router.get("/dashboard/recent-transactions", requireAuth, async (_req, res) => {
    try {
        const stockOut = await db
            .select({ id: stockOutTable.id, referenceNo: stockOutTable.referenceNo, status: stockOutTable.status, createdAt: stockOutTable.createdAt })
            .from(stockOutTable)
            .orderBy(desc(stockOutTable.createdAt))
            .limit(10);
        const all = stockOut.map(r => ({
            id: r.id,
            referenceNo: r.referenceNo,
            type: "stock_out",
            status: r.status,
            description: `Pengeluaran / Distribusi - ${r.referenceNo}`,
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        }));
        res.json(all);
    }
    catch (err) {
        res.json([]);
    }
});
// GET /dashboard/low-stock — Menampilkan stok cabang yang menipis (<= 5)
router.get("/dashboard/low-stock", requireAuth, async (_req, res) => {
    try {
        const rows = await db
            .select({
            id: branchStocksTable.id,
            code: itemsTable.code,
            name: itemsTable.name,
            branchName: branchesTable.name,
            currentStock: branchStocksTable.quantity,
        })
            .from(branchStocksTable)
            .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id))
            .innerJoin(branchesTable, eq(branchStocksTable.branchId, branchesTable.id))
            .where(sql `${branchStocksTable.quantity} <= 5`)
            .orderBy(branchStocksTable.quantity)
            .limit(20);
        res.json(rows);
    }
    catch (err) {
        res.json([]);
    }
});
// GET /dashboard/stock-movement
router.get("/dashboard/stock-movement", requireAuth, async (req, res) => {
    const daysParam = parseInt(req.query.days, 10);
    const days = daysParam === 30 ? 30 : 7;
    const isFinalized = (status) => !!status && ["finalized", "completed", "dikirim", "diproses", "selesai", "approved"].includes(status.toLowerCase());
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);
    const allStockOut = await db
        .select({ transactionDate: stockOutTable.transactionDate, status: stockOutTable.status })
        .from(stockOutTable)
        .where(gte(stockOutTable.transactionDate, startDate));
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const outCount = allStockOut.filter(r => {
            if (!isFinalized(r.status))
                return false;
            const rDate = new Date(r.transactionDate).toISOString().split("T")[0];
            return rDate === dateStr;
        }).length;
        result.push({
            date: dateStr,
            stockIn: 0,
            stockOut: outCount,
        });
    }
    res.json(result);
});
// GET /dashboard/stock-health
router.get("/dashboard/stock-health", requireAuth, async (_req, res) => {
    res.json({ aman: 0, menipis: 0, kritis: 0, habis: 0, overstock: 0 });
});
// GET /dashboard/aging
router.get("/dashboard/aging", requireAuth, async (_req, res) => {
    res.json({ "0-30": 0, "31-90": 0, "91-180": 0, "181-365": 0, ">365": 0 });
});
// GET /dashboard/exceptions
router.get("/dashboard/exceptions", requireAuth, async (_req, res) => {
    try {
        const slaDeadline = new Date();
        slaDeadline.setDate(slaDeadline.getDate() - SLA_DAYS);
        const [overdueResult] = await db.select({ count: sql `count(*)` })
            .from(materialTrackingTable)
            .where(and(lt(materialTrackingTable.createdAt, slaDeadline), sql `${materialTrackingTable.status} NOT IN ('TERVERIFIKASI', 'SELESAI')`));
        const [mismatchResult] = await db.select({ count: sql `count(*)` })
            .from(installationEvidenceTable)
            .where(eq(installationEvidenceTable.locationMismatch, true));
        const [rejectedResult] = await db.select({ count: sql `count(*)` })
            .from(installationEvidenceTable)
            .where(eq(installationEvidenceTable.status, "DITOLAK"));
        const [pendingVerif] = await db.select({ count: sql `count(*)` })
            .from(installationEvidenceTable)
            .where(eq(installationEvidenceTable.status, "PENDING"));
        res.json({
            overdue: Number(overdueResult?.count ?? 0),
            locationMismatch: Number(mismatchResult?.count ?? 0),
            evidenceRejected: Number(rejectedResult?.count ?? 0),
            waitingVerification: Number(pendingVerif?.count ?? 0),
            stockCritical: 0,
            stockEmpty: 0,
        });
    }
    catch (err) {
        res.json({ overdue: 0, locationMismatch: 0, evidenceRejected: 0, waitingVerification: 0, stockCritical: 0, stockEmpty: 0 });
    }
});
// GET /dashboard/top-outgoing
router.get("/dashboard/top-outgoing", requireAuth, async (_req, res) => {
    try {
        const rows = await db
            .select({
            itemId: stockOutItemsTable.itemId,
            itemName: itemsTable.name,
            totalQty: sql `CAST(SUM(${stockOutItemsTable.quantity}) AS INTEGER)`,
        })
            .from(stockOutItemsTable)
            .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
            .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
            .where(sql `${stockOutTable.status} IN ('finalized', 'DIKIRIM')`)
            .groupBy(stockOutItemsTable.itemId, itemsTable.name)
            .orderBy(sql `SUM(${stockOutItemsTable.quantity}) DESC`)
            .limit(5);
        res.json(rows);
    }
    catch (err) {
        res.json([]);
    }
});
// GET /dashboard/activity
router.get("/dashboard/activity", requireAuth, async (_req, res) => {
    try {
        const logs = await db
            .select({
            id: auditLogsTable.id,
            action: auditLogsTable.action,
            description: auditLogsTable.description,
            createdAt: auditLogsTable.createdAt,
        })
            .from(auditLogsTable)
            .orderBy(desc(auditLogsTable.createdAt))
            .limit(10);
        res.json(logs.map(l => ({
            id: l.id,
            action: l.action,
            entity: l.description,
            createdAt: l.createdAt.toISOString(),
        })));
    }
    catch (err) {
        res.json([]);
    }
});
// GET /dashboard/top-branches
router.get("/dashboard/top-branches", requireAuth, async (_req, res) => {
    try {
        const rows = await db
            .select({
            branchId: branchesTable.id,
            branchName: branchesTable.name,
            totalQty: sql `COALESCE(CAST(SUM(${stockOutItemsTable.quantity}) AS INTEGER), 0)`,
            itemCount: sql `COALESCE(CAST(COUNT(DISTINCT ${stockOutItemsTable.itemId}) AS INTEGER), 0)`,
        })
            .from(branchesTable)
            .leftJoin(stockOutTable, eq(branchesTable.id, stockOutTable.destinationBranchId))
            .leftJoin(stockOutItemsTable, eq(stockOutTable.id, stockOutItemsTable.stockOutId))
            .groupBy(branchesTable.id, branchesTable.name)
            .orderBy(sql `COALESCE(SUM(${stockOutItemsTable.quantity}), 0) DESC`)
            .limit(5);
        let results = rows.filter(r => r.totalQty > 0);
        if (results.length === 0) {
            const allBranches = await db.select({ branchId: branchesTable.id, branchName: branchesTable.name }).from(branchesTable).limit(5);
            results = allBranches.map(b => ({
                branchId: b.branchId,
                branchName: b.branchName,
                totalQty: 0,
                itemCount: 0,
            }));
        }
        res.json(results);
    }
    catch (err) {
        res.json([]);
    }
});
export default router;
