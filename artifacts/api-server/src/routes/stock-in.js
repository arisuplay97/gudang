// @ts-nocheck
import { Router } from "express";
import { eq, and, gte, lte, ilike, sql, desc } from "drizzle-orm";
import { db, stockInTable, stockInItemsTable, itemsTable, suppliersTable, usersTable, locationsTable, warehousesTable, auditLogsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
import { StockService } from "../lib/stock-service";
const router = Router();
// ─── LIST ───
router.get("/stock-in", requireAuth, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, startDate, endDate, search, supplierId, warehouseId } = req.query;
    // Build WHERE conditions
    const conditions = [];
    if (status)
        conditions.push(eq(stockInTable.status, status));
    if (supplierId)
        conditions.push(eq(stockInTable.supplierId, parseInt(supplierId)));
    if (warehouseId)
        conditions.push(eq(stockInTable.warehouseId, parseInt(warehouseId)));
    if (startDate)
        conditions.push(gte(stockInTable.transactionDate, new Date(startDate)));
    if (endDate)
        conditions.push(lte(stockInTable.transactionDate, new Date(endDate)));
    if (search)
        conditions.push(ilike(stockInTable.referenceNo, `%${search}%`));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    // Count total
    const [{ count }] = await db.select({ count: sql `count(*)` }).from(stockInTable).where(whereClause);
    const total = Number(count);
    // Fetch paginated
    const rows = await db
        .select({
        id: stockInTable.id,
        referenceNo: stockInTable.referenceNo,
        supplierId: stockInTable.supplierId,
        supplierName: suppliersTable.name,
        warehouseId: stockInTable.warehouseId,
        warehouseName: warehousesTable.name,
        status: stockInTable.status,
        notes: stockInTable.notes,
        createdBy: stockInTable.createdBy,
        createdByName: usersTable.fullName,
        transactionDate: stockInTable.transactionDate,
        createdAt: stockInTable.createdAt,
    })
        .from(stockInTable)
        .leftJoin(suppliersTable, eq(stockInTable.supplierId, suppliersTable.id))
        .leftJoin(warehousesTable, eq(stockInTable.warehouseId, warehousesTable.id))
        .leftJoin(usersTable, eq(stockInTable.createdBy, usersTable.id))
        .where(whereClause)
        .orderBy(desc(stockInTable.createdAt))
        .limit(limit)
        .offset(offset);
    // Get item counts per transaction
    const result = await Promise.all(rows.map(async (row) => {
        const [itemCount] = await db.select({ count: sql `count(*)` }).from(stockInItemsTable).where(eq(stockInItemsTable.stockInId, row.id));
        return {
            ...row,
            totalItems: Number(itemCount.count),
            transactionDate: row.transactionDate instanceof Date ? row.transactionDate.toISOString() : new Date(row.transactionDate).toISOString(),
            createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
        };
    }));
    res.json({ data: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});
// ─── CREATE ───
router.post("/stock-in", requireAuth, async (req, res) => {
    const { supplierId, warehouseId, notes, transactionDate, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "Minimal 1 item harus diisi" });
        return;
    }
    if (!transactionDate) {
        res.status(400).json({ error: "Tanggal transaksi wajib diisi" });
        return;
    }
    const refNo = generateRefNo("BM");
    const [header] = await db.insert(stockInTable).values({
        referenceNo: refNo,
        supplierId: supplierId ?? null,
        warehouseId: warehouseId ?? null,
        notes: notes ?? null,
        createdBy: req.session.userId ?? null,
        transactionDate: new Date(transactionDate),
        status: "draft",
    }).returning();
    for (const item of items) {
        if (!item.itemId || !item.quantity || item.quantity <= 0)
            continue;
        await db.insert(stockInItemsTable).values({
            stockInId: header.id,
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice || 0),
            locationId: item.locationId ?? null,
            notes: item.notes ?? null,
        });
    }
    await db.insert(auditLogsTable).values({
        entityType: "stock_in",
        entityId: header.id,
        action: "create",
        description: `Barang masuk ${refNo} dibuat`,
        userId: req.session.userId,
    });
    res.status(201).json({ ...header, referenceNo: refNo });
});
// ─── GET DETAIL ───
router.get("/stock-in/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const [header] = await db
        .select({
        id: stockInTable.id,
        referenceNo: stockInTable.referenceNo,
        supplierId: stockInTable.supplierId,
        supplierName: suppliersTable.name,
        warehouseId: stockInTable.warehouseId,
        warehouseName: warehousesTable.name,
        status: stockInTable.status,
        notes: stockInTable.notes,
        createdByName: usersTable.fullName,
        transactionDate: stockInTable.transactionDate,
        createdAt: stockInTable.createdAt,
    })
        .from(stockInTable)
        .leftJoin(suppliersTable, eq(stockInTable.supplierId, suppliersTable.id))
        .leftJoin(warehousesTable, eq(stockInTable.warehouseId, warehousesTable.id))
        .leftJoin(usersTable, eq(stockInTable.createdBy, usersTable.id))
        .where(eq(stockInTable.id, id));
    if (!header) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    const items = await db
        .select({
        id: stockInItemsTable.id,
        itemId: stockInItemsTable.itemId,
        itemCode: itemsTable.code,
        itemName: itemsTable.name,
        quantity: stockInItemsTable.quantity,
        unitPrice: stockInItemsTable.unitPrice,
        locationId: stockInItemsTable.locationId,
        locationName: locationsTable.name,
        notes: stockInItemsTable.notes,
    })
        .from(stockInItemsTable)
        .leftJoin(itemsTable, eq(stockInItemsTable.itemId, itemsTable.id))
        .leftJoin(locationsTable, eq(stockInItemsTable.locationId, locationsTable.id))
        .where(eq(stockInItemsTable.stockInId, id));
    res.json({
        ...header,
        transactionDate: header.transactionDate instanceof Date ? header.transactionDate.toISOString() : new Date(header.transactionDate).toISOString(),
        createdAt: header.createdAt instanceof Date ? header.createdAt.toISOString() : new Date(header.createdAt).toISOString(),
        items: items.map(i => ({ ...i, unitPrice: parseFloat(String(i.unitPrice)) })),
    });
});
// ─── FINALIZE (changes stock) ───
router.post("/stock-in/:id/finalize", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const [header] = await db.select().from(stockInTable).where(eq(stockInTable.id, id));
    if (!header) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    if (header.status === "finalized") {
        res.status(400).json({ error: "Sudah difinalisasi" });
        return;
    }
    if (header.status === "void") {
        res.status(400).json({ error: "Transaksi sudah dibatalkan" });
        return;
    }
    const items = await db.select().from(stockInItemsTable).where(eq(stockInItemsTable.stockInId, header.id));
    if (items.length === 0) {
        res.status(400).json({ error: "Tidak ada item dalam transaksi" });
        return;
    }
    const warehouseId = header.warehouseId;
    if (!warehouseId) {
        res.status(400).json({ error: "Gudang belum dipilih" });
        return;
    }
    await db.transaction(async (tx) => {
        for (const item of items) {
            await StockService.increaseStock(tx, item.itemId, warehouseId, item.quantity, {
                referenceType: "stock_in",
                referenceId: header.id,
                referenceNo: header.referenceNo,
                userId: req.session.userId,
                movementDate: header.transactionDate,
            });
        }
        await tx.update(stockInTable).set({ status: "finalized" }).where(eq(stockInTable.id, header.id));
    });
    await db.insert(auditLogsTable).values({
        entityType: "stock_in",
        entityId: header.id,
        action: "finalize",
        description: `Barang masuk ${header.referenceNo} difinalisasi, stok bertambah`,
        userId: req.session.userId,
    });
    res.json({ message: "Berhasil difinalisasi" });
});
// ─── VOID (reverse stock) ───
router.post("/stock-in/:id/void", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const [header] = await db.select().from(stockInTable).where(eq(stockInTable.id, id));
    if (!header) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    if (header.status === "void") {
        res.status(400).json({ error: "Sudah dibatalkan" });
        return;
    }
    const warehouseId = header.warehouseId;
    const wasFinalized = header.status === "finalized";
    await db.transaction(async (tx) => {
        if (wasFinalized && warehouseId) {
            // Reverse the stock
            const items = await tx.select().from(stockInItemsTable).where(eq(stockInItemsTable.stockInId, header.id));
            for (const item of items) {
                await StockService.reverseStock(tx, item.itemId, warehouseId, item.quantity, "in", {
                    referenceType: "stock_in",
                    referenceId: header.id,
                    referenceNo: header.referenceNo,
                    userId: req.session.userId,
                });
            }
        }
        await tx.update(stockInTable).set({ status: "void" }).where(eq(stockInTable.id, header.id));
    });
    await db.insert(auditLogsTable).values({
        entityType: "stock_in",
        entityId: header.id,
        action: "void",
        description: `Barang masuk ${header.referenceNo} dibatalkan${wasFinalized ? ", stok dikembalikan" : ""}`,
        userId: req.session.userId,
    });
    res.json({ message: "Berhasil dibatalkan" });
});
export default router;
