// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, desc, asc, isNull, and, or, ilike, sql } from "drizzle-orm";
import {
  db, itemsTable, categoriesTable, unitsTable, suppliersTable, auditLogsTable,
  stockInTable, stockInItemsTable, stockOutTable, stockOutItemsTable,
  adjustmentsTable, adjustmentItemsTable, returnsTable, returnItemsTable,
  mutationsTable, mutationItemsTable, branchesTable, departmentsTable,
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
router.get("/items/summary", requireAuth, async (_req, res): Promise<void> => {
  const [result] = await db.select({
    total: sql<number>`count(*)::int`,
    stokAman: sql<number>`count(*) filter (where ${itemsTable.currentStock} > ${itemsTable.minimumStock} and ${itemsTable.status} = 'active')::int`,
    stokMenipis: sql<number>`count(*) filter (where ${itemsTable.currentStock} > 0 and ${itemsTable.currentStock} <= ${itemsTable.minimumStock} and ${itemsTable.status} = 'active')::int`,
    stokHabis: sql<number>`count(*) filter (where ${itemsTable.currentStock} <= 0 and ${itemsTable.status} = 'active')::int`,
    tracked: sql<number>`count(*) filter (where ${itemsTable.trackingType} = 'TRACKED')::int`,
    nonTracked: sql<number>`count(*) filter (where ${itemsTable.trackingType} = 'NON_TRACKED' or ${itemsTable.trackingType} is null)::int`,
    inactive: sql<number>`count(*) filter (where ${itemsTable.status} = 'inactive')::int`,
  }).from(itemsTable);
  res.json(result);
});

// GET /items — list with server-side pagination, sorting, filtering
router.get("/items", requireAuth, async (req, res): Promise<void> => {
  const { search, categoryId, lowStock, trackingType, status, page: pageStr, limit: limitStr, sortBy, sortOrder } = req.query as Record<string, string | undefined>;

  const page = Math.max(1, parseInt(pageStr ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? "25") || 25));
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions: any[] = [];
  if (search) {
    const s = `%${search}%`;
    conditions.push(or(ilike(itemsTable.name, s), ilike(itemsTable.code, s), ilike(itemsTable.barcode, s)));
  }
  if (categoryId) {
    const cid = parseInt(categoryId);
    if (!isNaN(cid)) conditions.push(eq(itemsTable.categoryId, cid));
  }
  if (trackingType === "TRACKED" || trackingType === "NON_TRACKED") {
    conditions.push(eq(itemsTable.trackingType, trackingType));
  }
  if (status === "active" || status === "inactive") {
    conditions.push(eq(itemsTable.status, status));
  }
  if (status === "AMAN") {
    conditions.push(sql`${itemsTable.currentStock} > ${itemsTable.minimumStock}`);
    conditions.push(eq(itemsTable.status, "active"));
  }
  if (status === "MENIPIS") {
    conditions.push(sql`${itemsTable.currentStock} > 0 AND ${itemsTable.currentStock} <= ${itemsTable.minimumStock}`);
    conditions.push(eq(itemsTable.status, "active"));
  }
  if (status === "HABIS") {
    conditions.push(sql`${itemsTable.currentStock} <= 0`);
    conditions.push(eq(itemsTable.status, "active"));
  }
  if (lowStock === "true") {
    conditions.push(sql`${itemsTable.currentStock} <= ${itemsTable.minimumStock}`);
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
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(itemsTable);
  if (whereClause) countQuery = countQuery.where(whereClause) as any;
  const [{ count: total }] = await countQuery;

  // Fetch paginated data
  let dataQuery = joinedItems();
  if (whereClause) dataQuery = dataQuery.where(whereClause) as any;
  const rows = await (dataQuery as any).orderBy(orderFn(sortCol)).limit(limit).offset(offset);

  res.json({
    data: rows.map(fmtItem),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /items/low-stock — barang stok menipis
router.get("/items/low-stock", requireAuth, async (_req, res): Promise<void> => {
  const rows = await joinedItems().orderBy(itemsTable.currentStock);
  res.json(rows.filter(r => r.currentStock <= r.minimumStock).map(fmtItem));
});

// GET /items/:id/stock-card — kartu stok digital komprehensif
router.get("/items/:id/stock-card", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [item] = await joinedItems().where(eq(itemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Barang tidak ditemukan" }); return; }

  // 1. Stock In (Barang Masuk)
  const stockIns = await db
    .select({
      referenceNo: stockInTable.referenceNo,
      date: stockInTable.transactionDate,
      quantity: stockInItemsTable.quantity,
      unitPrice: stockInItemsTable.unitPrice,
      supplierName: suppliersTable.name,
      notes: stockInTable.notes,
    })
    .from(stockInItemsTable)
    .innerJoin(stockInTable, eq(stockInItemsTable.stockInId, stockInTable.id))
    .leftJoin(suppliersTable, eq(stockInTable.supplierId, suppliersTable.id))
    .where(eq(stockInItemsTable.itemId, id));

  // 2. Stock Out (Distribusi / Barang Keluar)
  const stockOuts = await db
    .select({
      referenceNo: stockOutTable.referenceNo,
      date: stockOutTable.transactionDate,
      quantity: stockOutItemsTable.quantity,
      unitPrice: stockOutItemsTable.unitPrice,
      branchName: branchesTable.name,
      departmentName: departmentsTable.name,
      notes: stockOutTable.notes,
    })
    .from(stockOutItemsTable)
    .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
    .leftJoin(branchesTable, eq(stockOutTable.destinationBranchId, branchesTable.id))
    .leftJoin(departmentsTable, eq(stockOutTable.departmentId, departmentsTable.id))
    .where(eq(stockOutItemsTable.itemId, id));

  // 3. Stock Adjustments (Penyesuaian Opname)
  const adjustments = await db
    .select({
      referenceNo: adjustmentsTable.referenceNo,
      date: adjustmentsTable.transactionDate,
      quantityAdjusted: adjustmentItemsTable.quantityAdjusted,
      reason: adjustmentsTable.reason,
      notes: adjustmentsTable.notes,
    })
    .from(adjustmentItemsTable)
    .innerJoin(adjustmentsTable, eq(adjustmentItemsTable.adjustmentId, adjustmentsTable.id))
    .where(eq(adjustmentItemsTable.itemId, id));

  // 4. Returns (Retur)
  const returns = await db
    .select({
      referenceNo: returnsTable.referenceNo,
      date: returnsTable.transactionDate,
      quantity: returnItemsTable.quantity,
      returnType: returnsTable.returnType,
      notes: returnsTable.notes,
    })
    .from(returnItemsTable)
    .innerJoin(returnsTable, eq(returnItemsTable.returnId, returnsTable.id))
    .where(eq(returnItemsTable.itemId, id));

  // 5. Mutations (Mutasi Antar Gudang)
  const mutations = await db
    .select({
      referenceNo: mutationsTable.referenceNo,
      date: mutationsTable.transactionDate,
      quantity: mutationItemsTable.quantity,
      notes: mutationsTable.notes,
    })
    .from(mutationItemsTable)
    .innerJoin(mutationsTable, eq(mutationItemsTable.mutationId, mutationsTable.id))
    .where(eq(mutationItemsTable.itemId, id));

  const allEntries = [
    ...stockIns.map(s => ({
      date: s.date instanceof Date ? s.date.toISOString() : s.date,
      type: "MASUK" as const,
      typeLabel: "Penerimaan Material",
      referenceNo: s.referenceNo,
      party: s.supplierName ? `Supplier: ${s.supplierName}` : "Gudang Masuk",
      notes: s.notes || "-",
      in: Number(s.quantity),
      out: 0,
      unitPrice: parseFloat(s.unitPrice ?? "0"),
    })),
    ...stockOuts.map(s => ({
      date: s.date instanceof Date ? s.date.toISOString() : s.date,
      type: "KELUAR" as const,
      typeLabel: "Distribusi Cabang",
      referenceNo: s.referenceNo,
      party: s.branchName ? `Cabang: ${s.branchName}` : s.departmentName ? `Dept: ${s.departmentName}` : "Distribusi",
      notes: s.notes || "-",
      in: 0,
      out: Number(s.quantity),
      unitPrice: parseFloat(s.unitPrice ?? "0"),
    })),
    ...adjustments.map(a => {
      const q = Number(a.quantityAdjusted);
      const isIncrease = q >= 0;
      return {
        date: a.date instanceof Date ? a.date.toISOString() : a.date,
        type: isIncrease ? "PENYESUAIAN (+)" as const : "PENYESUAIAN (-)" as const,
        typeLabel: "Penyesuaian Opname",
        referenceNo: a.referenceNo,
        party: a.reason ? `Alasan: ${a.reason}` : "Koreksi Fisik",
        notes: a.notes || "-",
        in: isIncrease ? q : 0,
        out: isIncrease ? 0 : Math.abs(q),
        unitPrice: 0,
      };
    }),
    ...returns.map(r => {
      const isCustomerOrBranch = (r.returnType || "").toUpperCase() !== "SUPPLIER";
      const qty = Number(r.quantity);
      return {
        date: r.date instanceof Date ? r.date.toISOString() : r.date,
        type: isCustomerOrBranch ? "RETUR CABANG" as const : "RETUR SUPPLIER" as const,
        typeLabel: isCustomerOrBranch ? "Retur dari Cabang" : "Retur ke Supplier",
        referenceNo: r.referenceNo,
        party: isCustomerOrBranch ? "Pengembalian Sisa/Rusak Cabang" : "Pengembalian ke Supplier",
        notes: r.notes || "-",
        in: isCustomerOrBranch ? qty : 0,
        out: isCustomerOrBranch ? 0 : qty,
        unitPrice: 0,
      };
    }),
    ...mutations.map(m => ({
      date: m.date instanceof Date ? m.date.toISOString() : m.date,
      type: "MUTASI" as const,
      typeLabel: "Mutasi Antar Gudang",
      referenceNo: m.referenceNo,
      party: "Perpindahan Fisik Gudang",
      notes: m.notes || "-",
      in: Number(m.quantity),
      out: Number(m.quantity),
      unitPrice: 0,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  let totalIn = 0;
  let totalOut = 0;

  const withBalance = allEntries.map(e => {
    runningBalance += e.in - e.out;
    totalIn += e.in;
    totalOut += e.out;
    return {
      ...e,
      balance: runningBalance,
    };
  });

  res.json({
    item: fmtItem(item),
    summary: {
      totalIn,
      totalOut,
      currentBalance: runningBalance,
      currentStock: item.currentStock,
      totalTransactions: withBalance.length,
    },
    entries: withBalance.reverse(),
  });
});

// POST /items/import — Import massal master material dari file Excel (.xlsx)
router.post("/items/import", requireAuth, async (req, res): Promise<void> => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Data material tidak boleh kosong" });
    return;
  }

  const allCats = await db.select().from(categoriesTable);
  const allUnits = await db.select().from(unitsTable);
  const allSups = await db.select().from(suppliersTable);

  const catMap = new Map(allCats.map(c => [c.name.toLowerCase().trim(), c.id]));
  const unitMap = new Map(allUnits.map(u => [u.name.toLowerCase().trim(), u.id]));
  const supMap = new Map(allSups.map(s => [s.name.toLowerCase().trim(), s.id]));

  const imported = [];
  const errors: string[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const raw = items[idx];
    const code = String(raw.code || "").trim();
    const name = String(raw.name || "").trim();

    if (!code || !name) {
      errors.push(`Baris ${idx + 1}: Kode Barang dan Nama Material wajib diisi.`);
      continue;
    }

    // Resolve or create category
    let categoryId = null;
    const catName = String(raw.categoryName || "").trim();
    if (catName) {
      const cKey = catName.toLowerCase();
      if (catMap.has(cKey)) {
        categoryId = catMap.get(cKey);
      } else {
        const [newCat] = await db.insert(categoriesTable).values({ name: catName }).returning();
        categoryId = newCat.id;
        catMap.set(cKey, categoryId);
      }
    }

    // Resolve or create unit
    let unitId = null;
    const unitName = String(raw.unitName || "").trim() || "Buah";
    if (unitName) {
      const uKey = unitName.toLowerCase();
      if (unitMap.has(uKey)) {
        unitId = unitMap.get(uKey);
      } else {
        const [newUnit] = await db.insert(unitsTable).values({ name: unitName, abbreviation: unitName.slice(0, 4) }).returning();
        unitId = newUnit.id;
        unitMap.set(uKey, unitId);
      }
    }

    // Resolve supplier
    let supplierId = null;
    const supName = String(raw.supplierName || "").trim();
    if (supName && supMap.has(supName.toLowerCase())) {
      supplierId = supMap.get(supName.toLowerCase());
    }

    const minStock = Math.max(0, parseInt(String(raw.minimumStock || 0), 10) || 0);
    const maxStock = Math.max(minStock, parseInt(String(raw.maximumStock || 100), 10) || 100);
    const curStock = Math.max(0, parseInt(String(raw.currentStock || 0), 10) || 0);
    const price = parseFloat(String(raw.unitPrice || 0)) || 0;
    const barcode = String(raw.barcode || code).trim();
    const trackingType = String(raw.trackingType || "NON_TRACKED").toUpperCase() === "TRACKED" ? "TRACKED" : "NON_TRACKED";

    try {
      const [existing] = await db.select().from(itemsTable).where(eq(itemsTable.code, code));
      if (existing) {
        const [updated] = await db
          .update(itemsTable)
          .set({
            name,
            barcode,
            categoryId: categoryId ?? existing.categoryId,
            unitId: unitId ?? existing.unitId,
            supplierId: supplierId ?? existing.supplierId,
            minimumStock: minStock,
            maximumStock: maxStock,
            unitPrice: price.toString(),
            trackingType,
            description: raw.description || existing.description,
            updatedAt: new Date(),
          })
          .where(eq(itemsTable.id, existing.id))
          .returning();
        imported.push(updated);
      } else {
        const [created] = await db
          .insert(itemsTable)
          .values({
            code,
            name,
            barcode,
            categoryId,
            unitId,
            supplierId,
            description: raw.description || null,
            minimumStock: minStock,
            maximumStock: maxStock,
            currentStock: curStock,
            unitPrice: price.toString(),
            trackingType,
            status: "active",
          })
          .returning();
        imported.push(created);
      }
    } catch (err: any) {
      errors.push(`Baris ${idx + 1} (${code}): ${err.message}`);
    }
  }

  res.json({
    success: true,
    totalReceived: items.length,
    totalImported: imported.length,
    errors,
  });
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
router.patch("/items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateItemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.unitPrice != null) updateData.unitPrice = String(parsed.data.unitPrice);
  if (updateData.barcode === "") updateData.barcode = null;

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

// POST /items/backfill-barcodes — generate barcode for existing items without one
router.post("/items/backfill-barcodes", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select({ id: itemsTable.id, code: itemsTable.code }).from(itemsTable).where(isNull(itemsTable.barcode));
  let updated = 0;
  for (const row of rows) {
    await db.update(itemsTable).set({ barcode: row.code }).where(eq(itemsTable.id, row.id));
    updated++;
  }
  res.json({ updated });
});

export default router;
