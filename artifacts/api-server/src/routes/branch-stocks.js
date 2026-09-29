// @ts-nocheck
import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, branchStocksTable, branchesTable, itemsTable, categoriesTable, unitsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
const router = Router();
// GET /branch-stocks — Mengambil sisa stok aksesoris per cabang
router.get("/branch-stocks", requireAuth, async (req, res) => {
    try {
        let branchId = req.query.branchId ? parseInt(req.query.branchId) : null;
        // Jika user adalah role CABANG dan tidak ada filter admin, batasi ke cabangnya sendiri
        if (req.session.userRole === "CABANG" && req.session.branchId) {
            branchId = req.session.branchId;
        }
        const conditions = [];
        if (branchId) {
            conditions.push(eq(branchStocksTable.branchId, branchId));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const rows = await db
            .select({
            id: branchStocksTable.id,
            branchId: branchStocksTable.branchId,
            branchName: branchesTable.name,
            itemId: branchStocksTable.itemId,
            itemCode: itemsTable.code,
            itemName: itemsTable.name,
            categoryName: categoriesTable.name,
            unitName: unitsTable.name,
            quantity: branchStocksTable.quantity,
            updatedAt: branchStocksTable.updatedAt,
        })
            .from(branchStocksTable)
            .innerJoin(branchesTable, eq(branchStocksTable.branchId, branchesTable.id))
            .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id))
            .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
            .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
            .where(whereClause)
            .orderBy(branchesTable.name, itemsTable.name);
        res.json({ data: rows });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "Gagal mengambil data stok cabang" });
    }
});
// GET /branch-stocks/summary — Ringkasan stok cabang untuk dashboard
router.get("/branch-stocks/summary", requireAuth, async (req, res) => {
    try {
        let userBranchId = req.query.branchId ? parseInt(req.query.branchId) : null;
        if (req.session.userRole === "CABANG" && req.session.branchId) {
            userBranchId = req.session.branchId;
        }
        const allBranches = await db
            .select({ id: branchesTable.id, name: branchesTable.name })
            .from(branchesTable)
            .where(eq(branchesTable.status, "active"))
            .orderBy(branchesTable.name);
        const stockRows = await db
            .select({
            branchId: branchStocksTable.branchId,
            branchName: branchesTable.name,
            itemId: branchStocksTable.itemId,
            itemCode: itemsTable.code,
            itemName: itemsTable.name,
            categoryName: categoriesTable.name,
            unitName: unitsTable.name,
            quantity: branchStocksTable.quantity,
        })
            .from(branchStocksTable)
            .innerJoin(branchesTable, eq(branchStocksTable.branchId, branchesTable.id))
            .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id))
            .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
            .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
            .orderBy(branchesTable.name, itemsTable.name);
        // Grouping by branch
        const branchSummaries = allBranches
            .filter(b => !userBranchId || b.id === userBranchId)
            .map(branch => {
            const branchItems = stockRows.filter(s => s.branchId === branch.id);
            const totalQuantity = branchItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
            return {
                branchId: branch.id,
                branchName: branch.name,
                itemCount: branchItems.length,
                totalQuantity,
                items: branchItems,
            };
        });
        const totalSystemQuantity = stockRows.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        res.json({
            totalBranches: allBranches.length,
            totalQuantityAllBranches: totalSystemQuantity,
            branchSummaries,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "Gagal mengambil ringkasan stok cabang" });
    }
});
export default router;
