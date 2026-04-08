// @ts-nocheck
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, itemsTable, categoriesTable, unitsTable, suppliersTable, auditLogsTable } from "@workspace/db";
import { ListItemsQueryParams, CreateItemBody, GetItemParams, UpdateItemParams, UpdateItemBody, DeleteItemParams, GetItemByBarcodeParams, } from "@workspace/api-zod";
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
        currentStock: row.currentStock,
        unitPrice: parseFloat(row.unitPrice),
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        createdAt: row.createdAt.toISOString(),
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
    currentStock: itemsTable.currentStock,
    unitPrice: itemsTable.unitPrice,
    supplierId: itemsTable.supplierId,
    supplierName: suppliersTable.name,
    createdAt: itemsTable.createdAt,
};
router.get("/items", requireAuth, async (req, res) => {
    const qp = ListItemsQueryParams.safeParse(req.query);
    let query = db
        .select(itemSelect)
        .from(itemsTable)
        .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
        .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
        .leftJoin(suppliersTable, eq(itemsTable.supplierId, suppliersTable.id));
    const rows = await query.orderBy(itemsTable.name);
    let filtered = rows;
    if (qp.success) {
        if (qp.data.categoryId) {
            filtered = filtered.filter(r => r.categoryId === qp.data.categoryId);
        }
        if (qp.data.search) {
            const s = qp.data.search.toLowerCase();
            filtered = filtered.filter(r => r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s) || (r.barcode && r.barcode.toLowerCase().includes(s)));
        }
        if (qp.data.lowStock === true) {
            filtered = filtered.filter(r => r.currentStock <= r.minimumStock);
        }
    }
    res.json(filtered.map(fmtItem));
});
router.post("/items", requireAuth, async (req, res) => {
    const parsed = CreateItemBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const [row] = await db.insert(itemsTable).values({
        ...parsed.data,
        unitPrice: String(parsed.data.unitPrice),
    }).returning();
    const [full] = await db.select(itemSelect).from(itemsTable)
        .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
        .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
        .leftJoin(suppliersTable, eq(itemsTable.supplierId, suppliersTable.id))
        .where(eq(itemsTable.id, row.id));
    await db.insert(auditLogsTable).values({
        entityType: "item",
        entityId: row.id,
        action: "create",
        description: `Barang ${row.name} ditambahkan`,
        userId: req.session.userId,
    });
    res.status(201).json(fmtItem(full));
});
router.get("/items/barcode/:barcode", requireAuth, async (req, res) => {
    const params = GetItemByBarcodeParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [row] = await db.select(itemSelect).from(itemsTable)
        .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
        .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
        .leftJoin(suppliersTable, eq(itemsTable.supplierId, suppliersTable.id))
        .where(eq(itemsTable.barcode, params.data.barcode));
    if (!row) {
        res.status(404).json({ error: "Barcode tidak ditemukan" });
        return;
    }
    res.json(fmtItem(row));
});
router.get("/items/:id", requireAuth, async (req, res) => {
    const params = GetItemParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [row] = await db.select(itemSelect).from(itemsTable)
        .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
        .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
        .leftJoin(suppliersTable, eq(itemsTable.supplierId, suppliersTable.id))
        .where(eq(itemsTable.id, params.data.id));
    if (!row) {
        res.status(404).json({ error: "Barang tidak ditemukan" });
        return;
    }
    res.json(fmtItem(row));
});
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
    const [updated] = await db.update(itemsTable).set(updateData).where(eq(itemsTable.id, params.data.id)).returning();
    if (!updated) {
        res.status(404).json({ error: "Barang tidak ditemukan" });
        return;
    }
    const [full] = await db.select(itemSelect).from(itemsTable)
        .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
        .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
        .leftJoin(suppliersTable, eq(itemsTable.supplierId, suppliersTable.id))
        .where(eq(itemsTable.id, params.data.id));
    res.json(fmtItem(full));
});
router.delete("/items/:id", requireAuth, async (req, res) => {
    const params = DeleteItemParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    await db.delete(itemsTable).where(eq(itemsTable.id, params.data.id));
    res.sendStatus(204);
});
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
            await db.insert(itemsTable).values({
                ...parsed.data,
                unitPrice: String(parsed.data.unitPrice),
            });
            success++;
        }
        catch (e) {
            errors.push(`Row ${i + 1}: ${e.message}`);
        }
    }
    res.json({ success, failed: errors.length, errors });
});
export default router;
