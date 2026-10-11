// @ts-nocheck
import { Router } from "express";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { db, branchStocksTable, branchStockMovementsTable, branchesTable, itemsTable, categoriesTable, unitsTable, usersTable, auditLogsTable, } from "@workspace/db";
import { requireAuth } from "../lib/auth";
const router = Router();
/**
 * Helper: Mencatat setiap mutasi stok cabang ke kartu stok (ledger)
 */
export async function recordBranchStockMovement(txOrDb, params) {
    try {
        await txOrDb.insert(branchStockMovementsTable).values({
            branchId: params.branchId,
            itemId: params.itemId,
            movementType: params.movementType,
            direction: params.direction,
            quantity: params.quantity,
            balanceBefore: params.balanceBefore,
            balanceAfter: params.balanceAfter,
            referenceType: params.referenceType || null,
            referenceId: params.referenceId || null,
            referenceNo: params.referenceNo || null,
            userId: params.userId || null,
            notes: params.notes || null,
        });
    }
    catch (err) {
        console.error("Gagal mencatat mutasi stok cabang:", err?.message || err);
    }
}
// GET /branch-stocks — Mengambil sisa stok aksesoris per cabang beserta ambang batas minimum
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
            minimumStock: sql `COALESCE(${branchStocksTable.minimumStock}, 5)`,
            maximumStock: sql `COALESCE(${branchStocksTable.maximumStock}, 100)`,
            usage30d: sql `COALESCE((
          SELECT SUM(bsm.quantity)::int
          FROM branch_stock_movements bsm
          WHERE bsm.branch_id = ${branchStocksTable.branchId}
            AND bsm.item_id = ${branchStocksTable.itemId}
            AND bsm.movement_type = 'INSTALLATION'
            AND bsm.movement_date >= NOW() - INTERVAL '30 days'
        ), 0)`,
            usage7d: sql `COALESCE((
          SELECT SUM(bsm.quantity)::int
          FROM branch_stock_movements bsm
          WHERE bsm.branch_id = ${branchStocksTable.branchId}
            AND bsm.item_id = ${branchStocksTable.itemId}
            AND bsm.movement_type = 'INSTALLATION'
            AND bsm.movement_date >= NOW() - INTERVAL '7 days'
        ), 0)`,
            updatedAt: branchStocksTable.updatedAt,
        })
            .from(branchStocksTable)
            .innerJoin(branchesTable, eq(branchStocksTable.branchId, branchesTable.id))
            .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id))
            .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
            .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
            .where(whereClause)
            .orderBy(branchesTable.name, itemsTable.name);
        const enrichedRows = rows.map((r) => {
            const usage30d = Number(r.usage30d) || 0;
            const usage7d = Number(r.usage7d) || 0;
            const dailyBurnRate = Math.round((usage30d / 30) * 100) / 100;
            const runoutDays = dailyBurnRate > 0 ? Math.round(Number(r.quantity) / dailyBurnRate) : null;
            return {
                ...r,
                usage30d,
                usage7d,
                dailyBurnRate,
                runoutDays,
            };
        });
        res.json({ data: enrichedRows });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "Gagal mengambil data stok cabang" });
    }
});
// GET /branch-stocks/quick-scan — Cek cepat via scan QR Label Rak / Bin Card
router.get("/branch-stocks/quick-scan", async (req, res) => {
    try {
        const code = req.query.code ? String(req.query.code).trim() : "";
        const branchId = req.query.branchId ? parseInt(req.query.branchId) : null;
        if (!code) {
            res.status(400).json({ error: "Kode material diperlukan" });
            return;
        }
        // Cari item berdasarkan kode
        const [item] = await db
            .select({
            id: itemsTable.id,
            code: itemsTable.code,
            name: itemsTable.name,
            categoryName: categoriesTable.name,
            unitName: unitsTable.name,
        })
            .from(itemsTable)
            .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
            .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
            .where(sql `LOWER(${itemsTable.code}) = LOWER(${code})`);
        if (!item) {
            res.status(404).json({ error: "Material tidak ditemukan" });
            return;
        }
        // Ambil data stok cabang
        const stocks = await db
            .select({
            id: branchStocksTable.id,
            branchId: branchStocksTable.branchId,
            branchName: branchesTable.name,
            quantity: branchStocksTable.quantity,
            minimumStock: sql `COALESCE(${branchStocksTable.minimumStock}, 5)`,
            maximumStock: sql `COALESCE(${branchStocksTable.maximumStock}, 100)`,
            updatedAt: branchStocksTable.updatedAt,
        })
            .from(branchStocksTable)
            .innerJoin(branchesTable, eq(branchStocksTable.branchId, branchesTable.id))
            .where(branchId
            ? and(eq(branchStocksTable.itemId, item.id), eq(branchStocksTable.branchId, branchId))
            : eq(branchStocksTable.itemId, item.id));
        const currentStock = stocks[0] || null;
        let usage30d = 0;
        let dailyBurnRate = 0;
        let runoutDays = null;
        let recentMovements = [];
        if (currentStock) {
            const [u30] = await db
                .select({
                total: sql `COALESCE(SUM(${branchStockMovementsTable.quantity})::int, 0)`,
            })
                .from(branchStockMovementsTable)
                .where(and(eq(branchStockMovementsTable.branchId, currentStock.branchId), eq(branchStockMovementsTable.itemId, item.id), eq(branchStockMovementsTable.movementType, "INSTALLATION"), gte(branchStockMovementsTable.movementDate, sql `NOW() - INTERVAL '30 days'`)));
            usage30d = Number(u30?.total) || 0;
            dailyBurnRate = Math.round((usage30d / 30) * 100) / 100;
            runoutDays = dailyBurnRate > 0 ? Math.round(Number(currentStock.quantity) / dailyBurnRate) : null;
            recentMovements = await db
                .select({
                id: branchStockMovementsTable.id,
                movementType: branchStockMovementsTable.movementType,
                direction: branchStockMovementsTable.direction,
                quantity: branchStockMovementsTable.quantity,
                movementDate: branchStockMovementsTable.movementDate,
                referenceNo: branchStockMovementsTable.referenceNo,
                notes: branchStockMovementsTable.notes,
            })
                .from(branchStockMovementsTable)
                .where(and(eq(branchStockMovementsTable.branchId, currentStock.branchId), eq(branchStockMovementsTable.itemId, item.id)))
                .orderBy(desc(branchStockMovementsTable.movementDate))
                .limit(3);
        }
        res.json({
            item,
            stock: currentStock,
            analytics: {
                usage30d,
                dailyBurnRate,
                runoutDays,
            },
            recentMovements,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "Gagal memindai data material" });
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
            minimumStock: branchStocksTable.minimumStock,
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
            const lowStockCount = branchItems.filter(s => s.quantity <= (s.minimumStock || 5)).length;
            return {
                branchId: branch.id,
                branchName: branch.name,
                itemCount: branchItems.length,
                totalQuantity,
                lowStockCount,
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
// PATCH /branch-stocks/:id/threshold — Update ambang batas minimum/safety stock per barang cabang
router.patch("/branch-stocks/:id/threshold", requireAuth, async (req, res) => {
    try {
        const stockId = parseInt(req.params.id);
        const { minimumStock, maximumStock } = req.body;
        if (minimumStock === undefined || minimumStock === null || isNaN(parseInt(minimumStock)) || parseInt(minimumStock) < 0) {
            res.status(400).json({ error: "Nilai minimum stock harus berupa angka bulat positif" });
            return;
        }
        const [current] = await db
            .select({
            id: branchStocksTable.id,
            branchId: branchStocksTable.branchId,
            itemId: branchStocksTable.itemId,
            quantity: branchStocksTable.quantity,
            minimumStock: branchStocksTable.minimumStock,
            branchName: branchesTable.name,
            itemName: itemsTable.name,
        })
            .from(branchStocksTable)
            .innerJoin(branchesTable, eq(branchStocksTable.branchId, branchesTable.id))
            .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id))
            .where(eq(branchStocksTable.id, stockId));
        if (!current) {
            res.status(404).json({ error: "Data stok cabang tidak ditemukan" });
            return;
        }
        // Role check: Cabang hanya boleh ubah cabangnya sendiri, Admin/Gudang bebas
        if (req.session.userRole === "CABANG" && req.session.branchId && req.session.branchId !== current.branchId) {
            res.status(403).json({ error: "Anda tidak berhak mengubah ambang batas stok cabang lain" });
            return;
        }
        const minVal = parseInt(minimumStock);
        const maxVal = maximumStock ? parseInt(maximumStock) : undefined;
        const [updated] = await db
            .update(branchStocksTable)
            .set({
            minimumStock: minVal,
            ...(maxVal !== undefined ? { maximumStock: maxVal } : {}),
            updatedAt: new Date(),
        })
            .where(eq(branchStocksTable.id, stockId))
            .returning();
        // Audit log
        await db.insert(auditLogsTable).values({
            entityType: "branch_stock",
            entityId: stockId,
            action: "update_threshold",
            description: `Ambang batas minimum ${current.itemName} di ${current.branchName} diubah dari ${current.minimumStock} ke ${minVal}`,
            userId: req.session.userId,
            username: req.session.username,
        });
        res.json({
            message: `Batas minimum stok untuk "${current.itemName}" di ${current.branchName} berhasil diperbarui menjadi ${minVal} unit.`,
            data: updated,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "Gagal memperbarui batas minimum stok cabang" });
    }
});
// GET /branch-stocks/:branchId/:itemId/ledger — Mengambil kartu riwayat mutasi (ledger) stok barang cabang
router.get("/branch-stocks/:branchId/:itemId/ledger", requireAuth, async (req, res) => {
    try {
        const branchId = parseInt(req.params.branchId);
        const itemId = parseInt(req.params.itemId);
        if (isNaN(branchId) || isNaN(itemId)) {
            res.status(400).json({ error: "branchId dan itemId harus valid" });
            return;
        }
        // Check branch access if role is CABANG
        if (req.session.userRole === "CABANG" && req.session.branchId && req.session.branchId !== branchId) {
            res.status(403).json({ error: "Anda hanya berhak melihat kartu stok cabang Anda sendiri" });
            return;
        }
        // Get current stock & metadata
        const [stockRow] = await db
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
            minimumStock: branchStocksTable.minimumStock,
            updatedAt: branchStocksTable.updatedAt,
        })
            .from(branchStocksTable)
            .innerJoin(branchesTable, eq(branchStocksTable.branchId, branchesTable.id))
            .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id))
            .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
            .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
            .where(and(eq(branchStocksTable.branchId, branchId), eq(branchStocksTable.itemId, itemId)));
        // Get movements from branchStockMovementsTable
        const conditions = [
            eq(branchStockMovementsTable.branchId, branchId),
            eq(branchStockMovementsTable.itemId, itemId),
        ];
        if (req.query.startDate) {
            conditions.push(gte(branchStockMovementsTable.movementDate, new Date(req.query.startDate)));
        }
        if (req.query.endDate) {
            conditions.push(lte(branchStockMovementsTable.movementDate, new Date(req.query.endDate)));
        }
        const movements = await db
            .select({
            id: branchStockMovementsTable.id,
            movementDate: branchStockMovementsTable.movementDate,
            movementType: branchStockMovementsTable.movementType,
            direction: branchStockMovementsTable.direction,
            quantity: branchStockMovementsTable.quantity,
            balanceBefore: branchStockMovementsTable.balanceBefore,
            balanceAfter: branchStockMovementsTable.balanceAfter,
            referenceType: branchStockMovementsTable.referenceType,
            referenceId: branchStockMovementsTable.referenceId,
            referenceNo: branchStockMovementsTable.referenceNo,
            notes: branchStockMovementsTable.notes,
            userId: branchStockMovementsTable.userId,
            userName: usersTable.fullName,
            createdAt: branchStockMovementsTable.createdAt,
        })
            .from(branchStockMovementsTable)
            .leftJoin(usersTable, eq(branchStockMovementsTable.userId, usersTable.id))
            .where(and(...conditions))
            .orderBy(desc(branchStockMovementsTable.movementDate), desc(branchStockMovementsTable.id));
        // Calculate in/out totals
        const totalIn = movements.filter(m => m.direction === "in").reduce((acc, m) => acc + (m.quantity || 0), 0);
        const totalOut = movements.filter(m => m.direction === "out").reduce((acc, m) => acc + (m.quantity || 0), 0);
        res.json({
            stockInfo: stockRow || null,
            summary: {
                currentBalance: stockRow ? stockRow.quantity : 0,
                totalIn,
                totalOut,
                movementCount: movements.length,
            },
            movements,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "Gagal mengambil data kartu stok cabang" });
    }
});
export default router;
