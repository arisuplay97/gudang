// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, opnameTable, opnameItemsTable, itemsTable, warehousesTable, usersTable, auditLogsTable } from "@workspace/db";
import { CreateOpnameBody, GetOpnameParams, FinalizeOpnameParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";

const router: IRouter = Router();

function fmtOpname(row: any, extras: { warehouseName?: string | null; createdByName?: string | null }) {
  return {
    id: row.id,
    referenceNo: row.referenceNo,
    warehouseId: row.warehouseId,
    warehouseName: extras.warehouseName ?? null,
    status: row.status,
    notes: row.notes,
    createdByName: extras.createdByName ?? null,
    startDate: row.startDate instanceof Date ? row.startDate.toISOString() : new Date(row.startDate).toISOString(),
    endDate: row.endDate ? (row.endDate instanceof Date ? row.endDate.toISOString() : new Date(row.endDate).toISOString()) : null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
  };
}

router.get("/opname", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: opnameTable.id,
      referenceNo: opnameTable.referenceNo,
      warehouseId: opnameTable.warehouseId,
      warehouseName: warehousesTable.name,
      status: opnameTable.status,
      notes: opnameTable.notes,
      createdByName: usersTable.fullName,
      startDate: opnameTable.startDate,
      endDate: opnameTable.endDate,
      createdAt: opnameTable.createdAt,
    })
    .from(opnameTable)
    .leftJoin(warehousesTable, eq(opnameTable.warehouseId, warehousesTable.id))
    .leftJoin(usersTable, eq(opnameTable.createdBy, usersTable.id))
    .orderBy(opnameTable.createdAt);

  res.json(rows.map(r => fmtOpname(r, { warehouseName: r.warehouseName, createdByName: r.createdByName })));
});

router.post("/opname", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOpnameBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const refNo = generateRefNo("OPN");
  const [header] = await db.insert(opnameTable).values({
    referenceNo: refNo,
    warehouseId: parsed.data.warehouseId ?? null,
    notes: parsed.data.notes ?? null,
    createdBy: req.session.userId ?? null,
    startDate: new Date(parsed.data.startDate),
    status: "draft",
  }).returning();

  for (const itemId of parsed.data.itemIds) {
    const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, itemId));
    if (item) {
      await db.insert(opnameItemsTable).values({
        opnameId: header.id,
        itemId: itemId,
        systemQty: item.currentStock,
        actualQty: null,
        notes: null,
      });
    }
  }

  res.status(201).json(fmtOpname(header, {}));
});

router.get("/opname/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOpnameParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [header] = await db
    .select({
      id: opnameTable.id,
      referenceNo: opnameTable.referenceNo,
      warehouseId: opnameTable.warehouseId,
      warehouseName: warehousesTable.name,
      status: opnameTable.status,
      notes: opnameTable.notes,
      startDate: opnameTable.startDate,
      endDate: opnameTable.endDate,
      createdAt: opnameTable.createdAt,
    })
    .from(opnameTable)
    .leftJoin(warehousesTable, eq(opnameTable.warehouseId, warehousesTable.id))
    .where(eq(opnameTable.id, params.data.id));

  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }

  const opItems = await db
    .select({
      id: opnameItemsTable.id,
      itemId: opnameItemsTable.itemId,
      itemCode: itemsTable.code,
      itemName: itemsTable.name,
      systemQty: opnameItemsTable.systemQty,
      actualQty: opnameItemsTable.actualQty,
      notes: opnameItemsTable.notes,
    })
    .from(opnameItemsTable)
    .leftJoin(itemsTable, eq(opnameItemsTable.itemId, itemsTable.id))
    .where(eq(opnameItemsTable.opnameId, params.data.id));

  res.json({
    ...header,
    startDate: header.startDate.toISOString(),
    endDate: header.endDate?.toISOString() ?? null,
    createdAt: header.createdAt.toISOString(),
    items: opItems.map(i => ({
      ...i,
      difference: i.actualQty != null ? i.actualQty - i.systemQty : null,
    })),
  });
});

router.post("/opname/:id/finalize", requireAuth, async (req, res): Promise<void> => {
  const params = FinalizeOpnameParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db.select().from(opnameTable).where(eq(opnameTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }

  await db.update(opnameTable)
    .set({ status: "finalized", endDate: new Date() })
    .where(eq(opnameTable.id, row.id));

  await db.insert(auditLogsTable).values({
    entityType: "opname",
    entityId: row.id,
    action: "finalize",
    description: `Stock opname ${row.referenceNo} difinalisasi`,
    userId: req.session.userId,
  });

  const [updated] = await db.select().from(opnameTable).where(eq(opnameTable.id, row.id));
  res.json(fmtOpname(updated, {}));
});

export default router;
