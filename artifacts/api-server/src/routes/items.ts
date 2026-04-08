// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db, itemsTable, categoriesTable, unitsTable, suppliersTable, auditLogsTable,
  stockInTable, stockInItemsTable, stockOutTable, stockOutItemsTable,
} from "@workspace/db";
import {
  ListItemsQueryParams, CreateItemBody, GetItemParams, UpdateItemParams, UpdateItemBody,
  DeleteItemParams, GetItemByBarcodeParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function fmtItem(row: any) {
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
    shelfRow: row.shelfRow ?? null,
    shelfColumn: row.shelfColumn ?? null,
    trackSerialNumber: row.trackSerialNumber ?? false,
    secondaryUnitId: row.secondaryUnitId ?? null,
    conversionFactor: row.conversionFactor ? parseFloat(row.conversionFactor) : 1,
    isLowStock: row.currentStock <= row.minimumStock,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
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
  shelfRow: itemsTable.shelfRow,
  shelfColumn: itemsTable.shelfColumn,
  trackSerialNumber: itemsTable.trackSerialNumber,
  secondaryUnitId: itemsTable.secondaryUnitId,
  conversionFactor: itemsTable.conversionFactor,
  createdAt: itemsTable.createdAt,
};

const joinedItems = () => db
  .select(itemSelect)
  .from(itemsTable)
  .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
  .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
  .leftJoin(suppliersTable, eq(itemsTable.supplierId, suppliersTable.id));

// GET /items — list semua barang
router.get("/items", requireAuth, async (req, res): Promise<void> => {
  const qp = ListItemsQueryParams.safeParse(req.query);
  let rows = await joinedItems().orderBy(itemsTable.name);

  if (qp.success) {
    if (qp.data.categoryId) rows = rows.filter(r => r.categoryId === qp.data.categoryId);
    if (qp.data.search) {
      const s = qp.data.search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s) || (r.barcode && r.barcode.toLowerCase().includes(s)));
    }
    if (qp.data.lowStock === true) rows = rows.filter(r => r.currentStock <= r.minimumStock);
  }

  res.json(rows.map(fmtItem));
});

// GET /items/low-stock — barang stok menipis
router.get("/items/low-stock", requireAuth, async (_req, res): Promise<void> => {
  const rows = await joinedItems().orderBy(itemsTable.currentStock);
  res.json(rows.filter(r => r.currentStock <= r.minimumStock).map(fmtItem));
});

// GET /items/:id/stock-card — kartu stok digital
router.get("/items/:id/stock-card", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [item] = await joinedItems().where(eq(itemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Barang tidak ditemukan" }); return; }

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
    ...stockIns.map(s => ({ date: s.date instanceof Date ? s.date.toISOString() : s.date, type: "in" as const, referenceNo: s.referenceNo, in: s.quantity, out: 0, unitPrice: parseFloat(s.unitPrice ?? "0") })),
    ...stockOuts.map(s => ({ date: s.date instanceof Date ? s.date.toISOString() : s.date, type: "out" as const, referenceNo: s.referenceNo, in: 0, out: s.quantity, unitPrice: parseFloat(s.unitPrice ?? "0") })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let balance = 0;
  const withBalance = entries.map(e => { balance += e.in - e.out; return { ...e, balance }; });

  res.json({ item: fmtItem(item), entries: withBalance.reverse() });
});

// GET /items/barcode/:barcode
router.get("/items/barcode/:barcode", requireAuth, async (req, res): Promise<void> => {
  const params = GetItemByBarcodeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await joinedItems().where(eq(itemsTable.barcode, params.data.barcode));
  if (!row) { res.status(404).json({ error: "Barcode tidak ditemukan" }); return; }
  res.json(fmtItem(row));
});

// GET /items/:id
router.get("/items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [row] = await joinedItems().where(eq(itemsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Barang tidak ditemukan" }); return; }
  res.json(fmtItem(row));
});

// POST /items
router.post("/items", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const dataToInsert = { ...parsed.data };
  if (!dataToInsert.barcode || dataToInsert.barcode.trim() === "") {
    dataToInsert.barcode = null;
  }

  const [row] = await db.insert(itemsTable).values({ ...dataToInsert, unitPrice: String(dataToInsert.unitPrice) }).returning();
  const [full] = await joinedItems().where(eq(itemsTable.id, row.id));

  await db.insert(auditLogsTable).values({ entityType: "item", entityId: row.id, action: "create", description: `Barang ${row.name} ditambahkan`, userId: req.session.userId, username: req.session.username });

  res.status(201).json(fmtItem(full));
});

// PATCH /items/:id
router.patch("/items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.barcode === "") updateData.barcode = null;
  if (parsed.data.unitPrice != null) updateData.unitPrice = String(parsed.data.unitPrice);

  const [updated] = await db.update(itemsTable).set(updateData).where(eq(itemsTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Barang tidak ditemukan" }); return; }

  const [full] = await joinedItems().where(eq(itemsTable.id, params.data.id));
  await db.insert(auditLogsTable).values({ entityType: "item", entityId: params.data.id, action: "update", description: `Barang ${updated.name} diperbarui`, userId: req.session.userId, username: req.session.username });

  res.json(fmtItem(full));
});

// DELETE /items/:id
router.delete("/items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [deleted] = await db.delete(itemsTable).where(eq(itemsTable.id, params.data.id)).returning();
  if (!deleted) { res.status(404).json({ error: "Barang tidak ditemukan" }); return; }

  await db.insert(auditLogsTable).values({ entityType: "item", entityId: params.data.id, action: "delete", description: `Barang ${deleted.name} dihapus`, userId: req.session.userId, username: req.session.username });
  res.sendStatus(204);
});

// POST /import/items
router.post("/import/items", requireAuth, async (req, res): Promise<void> => {
  const { items } = req.body as { items: unknown[] };
  if (!Array.isArray(items)) { res.status(400).json({ error: "items must be array" }); return; }

  let success = 0;
  const errors: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const parsed = CreateItemBody.safeParse(items[i]);
    if (!parsed.success) { errors.push(`Row ${i + 1}: ${parsed.error.message}`); continue; }
    try {
      await db.insert(itemsTable).values({ ...parsed.data, unitPrice: String(parsed.data.unitPrice) });
      success++;
    } catch (e: unknown) {
      errors.push(`Row ${i + 1}: ${(e as Error).message}`);
    }
  }

  res.json({ success, failed: errors.length, errors });
});

export default router;
