// @ts-nocheck
import { Router } from "express";
import { sql, gte, and, lt } from "drizzle-orm";
import { db, itemsTable, stockInTable, stockOutTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
const router = Router();
router.get("/dashboard/summary", requireAuth, async (_req, res) => {
    const allItems = await db.select().from(itemsTable);
    const totalItems = allItems.length;
    const lowStockCount = allItems.filter(i => i.currentStock <= i.minimumStock).length;
    const inventoryValue = allItems.reduce((sum, i) => sum + i.currentStock * parseFloat(i.unitPrice), 0);
    const stockInAll = await db.select().from(stockInTable);
    const stockOutAll = await db.select().from(stockOutTable);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStockIn = stockInAll.filter(r => r.transactionDate >= today && r.status === "finalized").length;
    const todayStockOut = stockOutAll.filter(r => r.transactionDate >= today && r.status === "finalized").length;
    const pendingIn = stockInAll.filter(r => r.status === "draft").length;
    const pendingOut = stockOutAll.filter(r => r.status === "draft").length;
    res.json({
        totalItems,
        totalStockIn: stockInAll.filter(r => r.status === "finalized").length,
        totalStockOut: stockOutAll.filter(r => r.status === "finalized").length,
        lowStockCount,
        pendingTransactions: pendingIn + pendingOut,
        inventoryValue,
        todayStockIn,
        todayStockOut,
    });
});
router.get("/dashboard/recent-transactions", requireAuth, async (_req, res) => {
    const stockIn = await db
        .select({ id: stockInTable.id, referenceNo: stockInTable.referenceNo, status: stockInTable.status, createdAt: stockInTable.createdAt })
        .from(stockInTable)
        .orderBy(stockInTable.createdAt)
        .limit(10);
    const stockOut = await db
        .select({ id: stockOutTable.id, referenceNo: stockOutTable.referenceNo, status: stockOutTable.status, createdAt: stockOutTable.createdAt })
        .from(stockOutTable)
        .orderBy(stockOutTable.createdAt)
        .limit(10);
    const all = [
        ...stockIn.map(r => ({ id: r.id, referenceNo: r.referenceNo, type: "stock_in", status: r.status, description: `Barang Masuk - ${r.referenceNo}`, createdAt: r.createdAt.toISOString() })),
        ...stockOut.map(r => ({ id: r.id, referenceNo: r.referenceNo, type: "stock_out", status: r.status, description: `Barang Keluar - ${r.referenceNo}`, createdAt: r.createdAt.toISOString() })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
    res.json(all);
});
router.get("/dashboard/low-stock", requireAuth, async (_req, res) => {
    const rows = await db
        .select({
        id: itemsTable.id,
        code: itemsTable.code,
        name: itemsTable.name,
        currentStock: itemsTable.currentStock,
        minimumStock: itemsTable.minimumStock,
    })
        .from(itemsTable)
        .where(sql `${itemsTable.currentStock} <= ${itemsTable.minimumStock}`)
        .orderBy(itemsTable.currentStock)
        .limit(20);
    res.json(rows.map(r => ({ ...r, unitName: null, categoryName: null })));
});
router.get("/dashboard/stock-movement", requireAuth, async (_req, res) => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const stockIn = await db.select().from(stockInTable)
            .where(and(gte(stockInTable.transactionDate, date), lt(stockInTable.transactionDate, nextDate)));
        const stockOut = await db.select().from(stockOutTable)
            .where(and(gte(stockOutTable.transactionDate, date), lt(stockOutTable.transactionDate, nextDate)));
        result.push({
            date: date.toISOString().split("T")[0],
            stockIn: stockIn.filter(r => r.status === "finalized").length,
            stockOut: stockOut.filter(r => r.status === "finalized").length,
        });
    }
    res.json(result);
});
export default router;
