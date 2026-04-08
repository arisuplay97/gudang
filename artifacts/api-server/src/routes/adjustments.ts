// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adjustmentsTable, itemsTable, usersTable, auditLogsTable } from "@workspace/db";
import { CreateAdjustmentBody, ApproveAdjustmentParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";

const router: IRouter = Router();

async function fmtAdjustment(row: typeof adjustmentsTable.$inferSelect) {
  const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, row.itemId));
  const [user] = row.createdBy ? await db.select().from(usersTable).where(eq(usersTable.id, row.createdBy)) : [null];
  return {
    id: row.id,
    referenceNo: row.referenceNo,
    itemId: row.itemId,
    itemName: item?.name ?? "",
    itemCode: item?.code ?? "",
    adjustmentType: row.adjustmentType,
    quantityBefore: row.quantityBefore,
    quantityAdjusted: row.quantityAdjusted,
    quantityAfter: row.quantityAfter,
    reason: row.reason,
    status: row.status,
    notes: row.notes,
    createdByName: user?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/adjustments", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(adjustmentsTable).orderBy(adjustmentsTable.createdAt);
  const result = await Promise.all(rows.map(fmtAdjustment));
  res.json(result);
});

router.post("/adjustments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAdjustmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, parsed.data.itemId));
  if (!item) { res.status(404).json({ error: "Barang tidak ditemukan" }); return; }

  const quantityAfter = parsed.data.adjustmentType === "add"
    ? item.currentStock + parsed.data.quantityAdjusted
    : item.currentStock - parsed.data.quantityAdjusted;

  const refNo = generateRefNo("ADJ");
  const [row] = await db.insert(adjustmentsTable).values({
    referenceNo: refNo,
    itemId: parsed.data.itemId,
    adjustmentType: parsed.data.adjustmentType,
    quantityBefore: item.currentStock,
    quantityAdjusted: parsed.data.quantityAdjusted,
    quantityAfter,
    reason: parsed.data.reason,
    notes: parsed.data.notes ?? null,
    createdBy: req.session.userId ?? null,
    status: "pending",
  }).returning();

  res.status(201).json(await fmtAdjustment(row));
});

router.post("/adjustments/:id/approve", requireAuth, async (req, res): Promise<void> => {
  const params = ApproveAdjustmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db.select().from(adjustmentsTable).where(eq(adjustmentsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  if (row.status === "approved") { res.status(400).json({ error: "Sudah disetujui" }); return; }

  await db.transaction(async (tx) => {
    await tx.update(adjustmentsTable)
      .set({ status: "approved", approvedBy: req.session.userId ?? null })
      .where(eq(adjustmentsTable.id, row.id));
    await tx.update(itemsTable)
      .set({ currentStock: row.quantityAfter })
      .where(eq(itemsTable.id, row.itemId));
  });

  await db.insert(auditLogsTable).values({
    entityType: "adjustment",
    entityId: row.id,
    action: "approve",
    description: `Penyesuaian stok ${row.referenceNo} disetujui`,
    userId: req.session.userId,
  });

  const [updated] = await db.select().from(adjustmentsTable).where(eq(adjustmentsTable.id, row.id));
  res.json(await fmtAdjustment(updated));
});

export default router;
