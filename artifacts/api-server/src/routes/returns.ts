// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, returnsTable, returnItemsTable, itemsTable, auditLogsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// GET /returns — list semua retur
router.get("/returns", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(returnsTable).orderBy(desc(returnsTable.createdAt));
  res.json(rows.map(r => ({
    ...r,
    transactionDate: r.transactionDate instanceof Date ? r.transactionDate.toISOString() : r.transactionDate,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  })));
});

// GET /returns/:id — detail retur dengan items
router.get("/returns/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [retur] = await db.select().from(returnsTable).where(eq(returnsTable.id, id));
  if (!retur) { res.status(404).json({ error: "Retur tidak ditemukan" }); return; }

  const items = await db
    .select({
      id: returnItemsTable.id,
      itemId: returnItemsTable.itemId,
      itemName: itemsTable.name,
      itemCode: itemsTable.code,
      quantity: returnItemsTable.quantity,
      condition: returnItemsTable.condition,
      unitPrice: returnItemsTable.unitPrice,
      serialNumber: returnItemsTable.serialNumber,
      notes: returnItemsTable.notes,
    })
    .from(returnItemsTable)
    .leftJoin(itemsTable, eq(returnItemsTable.itemId, itemsTable.id))
    .where(eq(returnItemsTable.returnId, id));

  res.json({
    ...retur,
    transactionDate: retur.transactionDate instanceof Date ? retur.transactionDate.toISOString() : retur.transactionDate,
    createdAt: retur.createdAt instanceof Date ? retur.createdAt.toISOString() : retur.createdAt,
    items: items.map(i => ({ ...i, unitPrice: i.unitPrice ? parseFloat(i.unitPrice) : 0 })),
  });
});

// POST /returns — buat retur baru
router.post("/returns", requireAuth, async (req, res): Promise<void> => {
  const { type, warehouseId, notes, transactionDate, items } = req.body;
  if (!items?.length) { res.status(400).json({ error: "Items harus diisi" }); return; }

  const refNo = `RET-${Date.now().toString().slice(-8)}`;

  const [retur] = await db.insert(returnsTable).values({
    referenceNo: refNo,
    type: type ?? "from_field",
    warehouseId: warehouseId ?? null,
    notes: notes ?? null,
    createdBy: req.session.userId,
    transactionDate: new Date(transactionDate ?? Date.now()),
  }).returning();

  for (const item of items) {
    await db.insert(returnItemsTable).values({
      returnId: retur.id,
      itemId: item.itemId,
      quantity: item.quantity,
      condition: item.condition ?? "good",
      unitPrice: item.unitPrice ? String(item.unitPrice) : "0",
      serialNumber: item.serialNumber ?? null,
      notes: item.notes ?? null,
    });

    // Kalau kondisi "good", tambah ke stok (increment atomic)
    if (item.condition === "good") {
      await db.update(itemsTable)
        .set({ currentStock: sql`${itemsTable.currentStock} + ${item.quantity}` })
        .where(eq(itemsTable.id, item.itemId));
    }
  }

  await db.insert(auditLogsTable).values({
    entityType: "return",
    entityId: retur.id,
    action: "create",
    description: `Retur ${refNo} dibuat`,
    userId: req.session.userId,
    username: req.session.username,
  });

  res.status(201).json({ id: retur.id, referenceNo: refNo });
});

export default router;
