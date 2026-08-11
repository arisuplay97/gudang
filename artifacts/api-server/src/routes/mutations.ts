// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, sql, desc } from "drizzle-orm";
import { db, mutationsTable, mutationItemsTable, itemsTable, warehousesTable, usersTable, auditLogsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
import { StockService } from "../lib/stock-service";

const router: IRouter = Router();

// ─── LIST ───
router.get("/mutations", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const { status, startDate, endDate, search } = req.query;

  const conditions: any[] = [];
  if (status) conditions.push(eq(mutationsTable.status, status as string));
  if (startDate) conditions.push(gte(mutationsTable.transactionDate, new Date(startDate as string)));
  if (endDate) conditions.push(lte(mutationsTable.transactionDate, new Date(endDate as string)));
  if (search) conditions.push(ilike(mutationsTable.referenceNo, `%${search}%`));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(mutationsTable).where(whereClause);

  const rows = await db
    .select({
      id: mutationsTable.id,
      referenceNo: mutationsTable.referenceNo,
      fromWarehouseId: mutationsTable.fromWarehouseId,
      toWarehouseId: mutationsTable.toWarehouseId,
      status: mutationsTable.status,
      notes: mutationsTable.notes,
      createdByName: usersTable.fullName,
      transactionDate: mutationsTable.transactionDate,
      createdAt: mutationsTable.createdAt,
    })
    .from(mutationsTable)
    .leftJoin(usersTable, eq(mutationsTable.createdBy, usersTable.id))
    .where(whereClause)
    .orderBy(desc(mutationsTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Enrich with warehouse names and item counts
  const result = await Promise.all(rows.map(async (row) => {
    const [fromWh] = await db.select({ name: warehousesTable.name }).from(warehousesTable).where(eq(warehousesTable.id, row.fromWarehouseId));
    const [toWh] = await db.select({ name: warehousesTable.name }).from(warehousesTable).where(eq(warehousesTable.id, row.toWarehouseId));
    const [itemCount] = await db.select({ count: sql<number>`count(*)` }).from(mutationItemsTable).where(eq(mutationItemsTable.mutationId, row.id));
    return {
      ...row,
      fromWarehouseName: fromWh?.name ?? null,
      toWarehouseName: toWh?.name ?? null,
      totalItems: Number(itemCount.count),
      transactionDate: row.transactionDate instanceof Date ? row.transactionDate.toISOString() : new Date(row.transactionDate).toISOString(),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
    };
  }));

  res.json({ data: result, pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) } });
});

// ─── CREATE ───
router.post("/mutations", requireAuth, async (req, res): Promise<void> => {
  const { fromWarehouseId, toWarehouseId, transactionDate, notes, items } = req.body;

  if (!fromWarehouseId || !toWarehouseId) { res.status(400).json({ error: "Gudang asal dan tujuan wajib diisi" }); return; }
  if (fromWarehouseId === toWarehouseId) { res.status(400).json({ error: "Gudang asal dan tujuan tidak boleh sama" }); return; }
  if (!items || !Array.isArray(items) || items.length === 0) { res.status(400).json({ error: "Minimal 1 item harus diisi" }); return; }
  if (!transactionDate) { res.status(400).json({ error: "Tanggal transaksi wajib diisi" }); return; }

  const refNo = generateRefNo("MT");

  const [header] = await db.insert(mutationsTable).values({
    referenceNo: refNo,
    fromWarehouseId,
    toWarehouseId,
    notes: notes ?? null,
    createdBy: req.session.userId ?? null,
    transactionDate: new Date(transactionDate),
    status: "draft",
  }).returning();

  for (const item of items) {
    if (!item.itemId || !item.quantity || item.quantity <= 0) continue;
    await db.insert(mutationItemsTable).values({
      mutationId: header.id,
      itemId: item.itemId,
      quantity: item.quantity,
      notes: item.notes ?? null,
    });
  }

  await db.insert(auditLogsTable).values({
    entityType: "mutation", entityId: header.id, action: "create",
    description: `Mutasi ${refNo} dibuat`, userId: req.session.userId,
  });

  res.status(201).json({ ...header, referenceNo: refNo });
});

// ─── GET DETAIL ───
router.get("/mutations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [header] = await db.select().from(mutationsTable).where(eq(mutationsTable.id, id));
  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }

  const [fromWh] = await db.select({ name: warehousesTable.name }).from(warehousesTable).where(eq(warehousesTable.id, header.fromWarehouseId));
  const [toWh] = await db.select({ name: warehousesTable.name }).from(warehousesTable).where(eq(warehousesTable.id, header.toWarehouseId));
  const [user] = header.createdBy ? await db.select({ name: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, header.createdBy)) : [null];

  const items = await db
    .select({
      id: mutationItemsTable.id,
      itemId: mutationItemsTable.itemId,
      itemCode: itemsTable.code,
      itemName: itemsTable.name,
      quantity: mutationItemsTable.quantity,
      notes: mutationItemsTable.notes,
    })
    .from(mutationItemsTable)
    .leftJoin(itemsTable, eq(mutationItemsTable.itemId, itemsTable.id))
    .where(eq(mutationItemsTable.mutationId, id));

  res.json({
    ...header,
    fromWarehouseName: fromWh?.name ?? null,
    toWarehouseName: toWh?.name ?? null,
    createdByName: user?.name ?? null,
    transactionDate: header.transactionDate instanceof Date ? header.transactionDate.toISOString() : new Date(header.transactionDate).toISOString(),
    createdAt: header.createdAt instanceof Date ? header.createdAt.toISOString() : new Date(header.createdAt).toISOString(),
    items,
  });
});

// ─── FINALIZE ───
router.post("/mutations/:id/finalize", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [header] = await db.select().from(mutationsTable).where(eq(mutationsTable.id, id));
  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  if (header.status === "finalized") { res.status(400).json({ error: "Sudah difinalisasi" }); return; }
  if (header.status === "void") { res.status(400).json({ error: "Sudah dibatalkan" }); return; }

  const items = await db.select().from(mutationItemsTable).where(eq(mutationItemsTable.mutationId, header.id));
  if (items.length === 0) { res.status(400).json({ error: "Tidak ada item dalam transaksi" }); return; }

  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await StockService.transferStock(tx, item.itemId, header.fromWarehouseId, header.toWarehouseId, item.quantity, {
          referenceType: "mutation",
          referenceId: header.id,
          referenceNo: header.referenceNo,
          userId: req.session.userId,
          movementDate: header.transactionDate,
        });
      }
      await tx.update(mutationsTable).set({ status: "finalized" }).where(eq(mutationsTable.id, header.id));
    });
  } catch (err: any) {
    if (err.message?.includes("Stok tidak mencukupi")) {
      res.status(400).json({ error: err.message }); return;
    }
    throw err;
  }

  await db.insert(auditLogsTable).values({
    entityType: "mutation", entityId: header.id, action: "finalize",
    description: `Mutasi ${header.referenceNo} difinalisasi`, userId: req.session.userId,
  });

  res.json({ message: "Berhasil difinalisasi" });
});

// ─── VOID ───
router.post("/mutations/:id/void", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [header] = await db.select().from(mutationsTable).where(eq(mutationsTable.id, id));
  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  if (header.status === "void") { res.status(400).json({ error: "Sudah dibatalkan" }); return; }

  const wasFinalized = header.status === "finalized";

  await db.transaction(async (tx) => {
    if (wasFinalized) {
      const items = await tx.select().from(mutationItemsTable).where(eq(mutationItemsTable.mutationId, header.id));
      for (const item of items) {
        // Reverse: increase source, decrease destination
        await StockService.transferStock(tx, item.itemId, header.toWarehouseId, header.fromWarehouseId, item.quantity, {
          referenceType: "void",
          referenceId: header.id,
          referenceNo: header.referenceNo,
          userId: req.session.userId,
        });
      }
    }
    await tx.update(mutationsTable).set({ status: "void" }).where(eq(mutationsTable.id, header.id));
  });

  await db.insert(auditLogsTable).values({
    entityType: "mutation", entityId: header.id, action: "void",
    description: `Mutasi ${header.referenceNo} dibatalkan`, userId: req.session.userId,
  });

  res.json({ message: "Berhasil dibatalkan" });
});

export default router;
