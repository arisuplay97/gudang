// @ts-nocheck
import { Router } from "express";
import { eq, desc, asc, isNull, and, or, ilike, sql } from "drizzle-orm";
import { db, itemsTable, categoriesTable, unitsTable, suppliersTable, auditLogsTable, stockInTable, stockInItemsTable, stockOutTable, stockOutItemsTable, } from "@workspace/db";
import { CreateItemBody, GetItemParams, UpdateItemParams, UpdateItemBody, DeleteItemParams, GetItemByBarcodeParams, } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
const router = Router();
function fmtItem(row) {
    return {
        id: row.id,
        code: row.code,
        name: row.name,
        barcode: row.barcode,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        unitId: row.unitId,
        unitName: row.unitName,
        unitAbbreviation: row.unitAbbreviation,
        description: row.description,
        minimumStock: row.minimumStock,
        maximumStock: row.maximumStock ?? 0,
        currentStock: row.currentStock,
        unitPrice: parseFloat(row.unitPrice),
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        rackId: row.rackId ?? null,
        trackingType: row.trackingType ?? "NON_TRACKED",
        trackSerialNumber: row.trackSerialNumber ?? false,
        secondaryUnitId: row.secondaryUnitId ?? null,
        conversionFactor: row.conversionFactor ? parseFloat(row.conversionFactor) : 1,
        status: row.status ?? "active",
        isLowStock: row.currentStock <= row.minimumStock,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
}
const itemSelect = {
    id: itemsTable.id,
    code: itemsTable.code,
    name: itemsTable.name,
    barcode: itemsTable.barcode,
    categoryId: itemsTable.categoryId,
    categoryName: categoriesTable.name,
    unitId: itemsTable.unitId,
    unitName: unitsTable.name,
    unitAbbreviation: unitsTable.abbreviation,
    description: itemsTable.description,
    minimumStock: itemsTable.minimumStock,
    maximumStock: itemsTable.maximumStock,
    currentStock: itemsTable.currentStock,
    unitPrice: itemsTable.unitPrice,
    supplierId: itemsTable.supplierId,
    supplierName: suppliersTable.name,
    rackId: itemsTable.rackId,
    trackingType: itemsTable.trackingType,
    trackSerialNumber: itemsTable.trackSerialNumber,
    secondaryUnitId: itemsTable.secondaryUnitId,
    conversionFactor: itemsTable.conversionFactor,
    status: itemsTable.status,
    createdAt: itemsTable.createdAt,
    updatedAt: itemsTable.updatedAt,
};
const joinedItems = () => db
    .select(itemSelect)
    .from(itemsTable)
    .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
    .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
    .leftJoin(suppliersTable, eq(itemsTable.supplierId, suppliersTable.id));
// GET /items/summary — KPI counts for dashboard cards
router.get("/items/summary", requireAuth, async (_req, res) => {
    const [result] = await db.select({
        total: sql `count(*)::int`,
        stokAman: sql `count(*) filter (where ${itemsTable.currentStock} > ${itemsTable.minimumStock} and ${itemsTable.status} = 'active')::int`,
        stokMenipis: sql `count(*) filter (where ${itemsTable.currentStock} > 0 and ${itemsTable.currentStock} <= ${itemsTable.minimumStock} and ${itemsTable.status} = 'active')::int`,
        stokHabis: sql `count(*) filter (where ${itemsTable.currentStock} <= 0 and ${itemsTable.status} = 'active')::int`,
        tracked: sql `count(*) filter (where ${itemsTable.trackingType} = 'TRACKED')::int`,
        nonTracked: sql `count(*) filter (where ${itemsTable.trackingType} = 'NON_TRACKED' or ${itemsTable.trackingType} is null)::int`,
        inactive: sql `count(*) filter (where ${itemsTable.status} = 'inactive')::int`,
    }).from(itemsTable);
    res.json(result);
});
// GET /items — list with server-side pagination, sorting, filtering
router.get("/items", requireAuth, async (req, res) => {
    const { search, categoryId, lowStock, trackingType, status, page: pageStr, limit: limitStr, sortBy, sortOrder } = req.query;
    const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? "25") || 25));
    const offset = (page - 1) * limit;
    // Build WHERE conditions
    const conditions = [];
    if (search) {
        const s = `%${search}%`;
        conditions.push(or(ilike(itemsTable.name, s), ilike(itemsTable.code, s), ilike(itemsTable.barcode, s)));
    }
    if (categoryId) {
        const cid = parseInt(categoryId);
        if (!isNaN(cid))
            conditions.push(eq(itemsTable.categoryId, cid));
    }
    if (trackingType === "TRACKED" || trackingType === "NON_TRACKED") {
        conditions.push(eq(itemsTable.trackingType, trackingType));
    }
    if (status === "active" || status === "inactive") {
        conditions.push(eq(itemsTable.status, status));
    }
    if (status === "AMAN") {
        conditions.push(sql `${itemsTable.currentStock} > ${itemsTable.minimumStock}`);
        conditions.push(eq(itemsTable.status, "active"));
    }
    if (status === "MENIPIS") {
        conditions.push(sql `${itemsTable.currentStock} > 0 AND ${itemsTable.currentStock} <= ${itemsTable.minimumStock}`);
        conditions.push(eq(itemsTable.status, "active"));
    }
    if (status === "HABIS") {
        conditions.push(sql `${itemsTable.currentStock} <= 0`);
        conditions.push(eq(itemsTable.status, "active"));
    }
    if (lowStock === "true") {
        conditions.push(sql `${itemsTable.currentStock} <= ${itemsTable.minimumStock}`);
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    // Determine sort column
    const sortCol = (() => {
        switch (sortBy) {
            case "code": return itemsTable.code;
            case "stock": return itemsTable.currentStock;
            case "createdAt": return itemsTable.createdAt;
            case "updatedAt": return itemsTable.updatedAt;
            case "name":
            default: return itemsTable.name;
        }
    })();
    const orderFn = sortOrder === "desc" ? desc : asc;
    // Count total matching rows
    let countQuery = db.select({ count: sql `count(*)::int` }).from(itemsTable);
    if (whereClause)
        countQuery = countQuery.where(whereClause);
    const [{ count: total }] = await countQuery;
    // Fetch paginated data
    let dataQuery = joinedItems();
    if (whereClause)
        dataQuery = dataQuery.where(whereClause);
    const rows = await dataQuery.orderBy(orderFn(sortCol)).limit(limit).offset(offset);
    res.json({
        data: rows.map(fmtItem),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    });
});
// GET /items/low-stock — barang stok menipis
router.get("/items/low-stock", requireAuth, async (_req, res) => {
    const rows = await joinedItems().orderBy(itemsTable.currentStock);
    res.json(rows.filter(r => r.currentStock <= r.minimumStock).map(fmtItem));
});
// GET /items/:id/stock-card — kartu stok digital
router.get("/items/:id/stock-card", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const [item] = await joinedItems().where(eq(itemsTable.id, id));
    if (!item) {
        res.status(404).json({ error: "Barang tidak ditemukan" });
        return;
    }
    const stockIns = await db
        .select({ referenceNo: stockInTable.referenceNo, date: stockInTable.transactionDate, quantity: stockInItemsTable.quantity, unitPrice: stockInItemsTable.unitPrice })
        .from(stockInItemsTable)
        .innerJoin(stockInTable, eq(stockInItemsTable.stockInId, stockInTable.id))
        .where(eq(stockInItemsTable.itemId, id));
    const stockOuts = await db
        .select({ referenceNo: stockOutTable.referenceNo, date: stockOutTable.transactionDate, quantity: stockOutItemsTable.quantity, unitPrice: stockOutItemsTable.unitPrice })
        .from(stockOutItemsTable)
        .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
        .where(eq(stockOutItemsTable.itemId, id));
    const entries = [
        ...stockIns.map(s => ({ date: s.date instanceof Date ? s.date.toISOString() : s.date, type: "in", referenceNo: s.referenceNo, in: s.quantity, out: 0, unitPrice: parseFloat(s.unitPrice ?? "0") })),
        ...stockOuts.map(s => ({ date: s.date instanceof Date ? s.date.toISOString() : s.date, type: "out", referenceNo: s.referenceNo, in: 0, out: s.quantity, unitPrice: parseFloat(s.unitPrice ?? "0") })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    const withBalance = entries.map(e => { balance += e.in - e.out; return { ...e, balance }; });
    res.json({ item: fmtItem(item), entries: withBalance.reverse() });
});
// GET /items/barcode/:barcode
router.get("/items/barcode/:barcode", requireAuth, async (req, res) => {
    const params = GetItemByBarcodeParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [row] = await joinedItems().where(eq(itemsTable.barcode, params.data.barcode));
    if (!row) {
        res.status(404).json({ error: "Barcode tidak ditemukan" });
        return;
    }
    res.json(fmtItem(row));
});
// GET /items/:id
router.get("/items/:id", requireAuth, async (req, res) => {
    const params = GetItemParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [row] = await joinedItems().where(eq(itemsTable.id, params.data.id));
    if (!row) {
        res.status(404).json({ error: "Barang tidak ditemukan" });
        return;
    }
    res.json(fmtItem(row));
});
// POST /items
router.post("/items", requireAuth, async (req, res) => {
    const parsed = CreateItemBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const insertData = { ...parsed.data, unitPrice: String(parsed.data.unitPrice) };
    // Auto-generate barcode from code if not provided
    if (!insertData.barcode || insertData.barcode === "") {
        insertData.barcode = insertData.code;
    }
    const [row] = await db.insert(itemsTable).values(insertData).returning();
    const [full] = await joinedItems().where(eq(itemsTable.id, row.id));
    await db.insert(auditLogsTable).values({ entityType: "item", entityId: row.id, action: "create", description: `Barang ${row.name} ditambahkan (barcode: ${row.barcode})`, userId: req.session.userId, username: req.session.username });
    res.status(201).json(fmtItem(full));
});
// PATCH /items/:id
router.patch("/items/:id", requireAuth, async (req, res) => {
    const params = UpdateItemParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const parsed = UpdateItemBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const updateData = { ...parsed.data };
    if (parsed.data.unitPrice != null)
        updateData.unitPrice = String(parsed.data.unitPrice);
    if (updateData.barcode === "")
        updateData.barcode = null;
    const [updated] = await db.update(itemsTable).set(updateData).where(eq(itemsTable.id, params.data.id)).returning();
    if (!updated) {
        res.status(404).json({ error: "Barang tidak ditemukan" });
        return;
    }
    const [full] = await joinedItems().where(eq(itemsTable.id, params.data.id));
    await db.insert(auditLogsTable).values({ entityType: "item", entityId: params.data.id, action: "update", description: `Barang ${updated.name} diperbarui`, userId: req.session.userId, username: req.session.username });
    res.json(fmtItem(full));
});
// DELETE /items/:id
router.delete("/items/:id", requireAuth, async (req, res) => {
    const params = DeleteItemParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [deleted] = await db.delete(itemsTable).where(eq(itemsTable.id, params.data.id)).returning();
    if (!deleted) {
        res.status(404).json({ error: "Barang tidak ditemukan" });
        return;
    }
    await db.insert(auditLogsTable).values({ entityType: "item", entityId: params.data.id, action: "delete", description: `Barang ${deleted.name} dihapus`, userId: req.session.userId, username: req.session.username });
    res.sendStatus(204);
});
// POST /import/items
router.post("/import/items", requireAuth, async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
        res.status(400).json({ error: "items must be array" });
        return;
    }
    let success = 0;
    const errors = [];
    for (let i = 0; i < items.length; i++) {
        const parsed = CreateItemBody.safeParse(items[i]);
        if (!parsed.success) {
            errors.push(`Row ${i + 1}: ${parsed.error.message}`);
            continue;
        }
        try {
            await db.insert(itemsTable).values({ ...parsed.data, unitPrice: String(parsed.data.unitPrice) });
            success++;
        }
        catch (e) {
            errors.push(`Row ${i + 1}: ${e.message}`);
        }
    }
    res.json({ success, failed: errors.length, errors });
});
// POST /items/backfill-barcodes — generate barcode for existing items without one
router.post("/items/backfill-barcodes", requireAuth, async (req, res) => {
    const rows = await db.select({ id: itemsTable.id, code: itemsTable.code }).from(itemsTable).where(isNull(itemsTable.barcode));
    let updated = 0;
    for (const row of rows) {
        await db.update(itemsTable).set({ barcode: row.code }).where(eq(itemsTable.id, row.id));
        updated++;
    }
    res.json({ updated });
});
export default router;
