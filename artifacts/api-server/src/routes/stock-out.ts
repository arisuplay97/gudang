// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, stockOutTable, stockOutItemsTable, itemsTable, departmentsTable, usersTable, locationsTable, auditLogsTable, itemBatchesTable, bppBatchAllocationsTable, projectsTable } from "@workspace/db";
import { CreateStockOutBody, ListStockOutQueryParams, GetStockOutParams, FinalizeStockOutParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
import { like, desc } from "drizzle-orm";
import { z } from "zod";

const CustomCreateStockOut = z.object({
   projectId: z.number().optional(),
   departmentId: z.number().optional(),
   requestedBy: z.string().optional(),
   notes: z.string().optional(),
   transactionDate: z.string(),
   bppType: z.string().optional(),
   jobTypeId: z.number().optional(),
   items: z.array(z.object({
     itemId: z.number(),
     quantity: z.number(),
     unitPrice: z.number().or(z.string()),
     locationId: z.number().nullable().optional(),
     notes: z.string().nullable().optional(),
   })),
});

const router: IRouter = Router();

function fmtStockOut(row: any, extras: { departmentName?: string | null; createdByName?: string | null; totalItems?: number }) {
  return {
    id: row.id,
    referenceNo: row.referenceNo,
    departmentId: row.departmentId,
    departmentName: extras.departmentName ?? null,
    projectId: row.projectId,
    projectName: extras.projectName ?? null,
    bppNumber: row.bppNumber,
    requestedBy: row.requestedBy,
    status: row.status,
    notes: row.notes,
    createdByName: extras.createdByName ?? null,
    totalItems: extras.totalItems ?? 0,
    transactionDate: row.transactionDate instanceof Date ? row.transactionDate.toISOString() : new Date(row.transactionDate).toISOString(),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
  };
}

router.get("/stock-out", requireAuth, async (req, res): Promise<void> => {
  const qp = ListStockOutQueryParams.safeParse(req.query);
  const rows = await db
    .select({
      id: stockOutTable.id,
      referenceNo: stockOutTable.referenceNo,
      bppNumber: stockOutTable.bppNumber,
      projectId: stockOutTable.projectId,
      projectName: projectsTable.name,
      departmentId: stockOutTable.departmentId,
      departmentName: departmentsTable.name,
      requestedBy: stockOutTable.requestedBy,
      status: stockOutTable.status,
      notes: stockOutTable.notes,
      createdByName: usersTable.fullName,
      transactionDate: stockOutTable.transactionDate,
      createdAt: stockOutTable.createdAt,
    })
    .from(stockOutTable)
    .leftJoin(projectsTable, eq(stockOutTable.projectId, projectsTable.id))
    .leftJoin(departmentsTable, eq(stockOutTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(stockOutTable.createdBy, usersTable.id))
    .orderBy(stockOutTable.createdAt);

  let filtered = rows;
  if (qp.success) {
    if (qp.data.status) filtered = filtered.filter(r => r.status === qp.data.status);
  }

  const result = await Promise.all(filtered.map(async (row) => {
    const items = await db.select().from(stockOutItemsTable).where(eq(stockOutItemsTable.stockOutId, row.id));
    return { ...fmtStockOut(row, { departmentName: row.departmentName, projectName: row.projectName, createdByName: row.createdByName }), totalItems: items.length };
  }));

  res.json(result);
});

router.post("/stock-out", requireAuth, async (req, res): Promise<void> => {
  const parsed = CustomCreateStockOut.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }

  const prefix = parsed.data.bppType === "SR" ? "BPP-SR" : "BPP";
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const lastDoc = await db.select()
    .from(stockOutTable)
    .where(like(stockOutTable.bppNumber, `${prefix} % - ${m}/${y}`))
    .orderBy(desc(stockOutTable.bppNumber))
    .limit(1);

  let nextNum = 1;
  if (lastDoc.length > 0) {
    const rx = new RegExp(`${prefix} (\\d+) - `);
    const match = lastDoc[0].bppNumber?.match(rx);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const bppNo = `${prefix} ${String(nextNum).padStart(4, "0")} - ${m}/${y}`;
  const refNo = generateRefNo("BK");

  const [header] = await db.insert(stockOutTable).values({
    referenceNo: refNo,
    bppNumber: bppNo,
    bppType: parsed.data.bppType ?? null,
    jobTypeId: parsed.data.jobTypeId ?? null,
    projectId: parsed.data.projectId ?? null,
    departmentId: parsed.data.departmentId ?? null,
    requestedBy: parsed.data.requestedBy ?? null,
    notes: parsed.data.notes ?? null,
    createdBy: req.session.userId ?? null,
    transactionDate: new Date(parsed.data.transactionDate),
    status: "draft",
  }).returning();

  for (const item of parsed.data.items) {
    await db.insert(stockOutItemsTable).values({
      stockOutId: header.id,
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      locationId: item.locationId ?? null,
      notes: item.notes ?? null,
    });
  }

  await db.insert(auditLogsTable).values({
    entityType: "stock_out",
    entityId: header.id,
    action: "create",
    description: `Barang keluar ${refNo} dibuat`,
    userId: req.session.userId,
  });

  res.status(201).json(fmtStockOut(header, { totalItems: parsed.data.items.length }));
});

router.get("/stock-out/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetStockOutParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [header] = await db
    .select({
      id: stockOutTable.id,
      referenceNo: stockOutTable.referenceNo,
      bppNumber: stockOutTable.bppNumber,
      projectId: stockOutTable.projectId,
      projectName: projectsTable.name,
      departmentId: stockOutTable.departmentId,
      departmentName: departmentsTable.name,
      requestedBy: stockOutTable.requestedBy,
      status: stockOutTable.status,
      notes: stockOutTable.notes,
      createdByName: usersTable.fullName,
      transactionDate: stockOutTable.transactionDate,
      createdAt: stockOutTable.createdAt,
    })
    .from(stockOutTable)
    .leftJoin(projectsTable, eq(stockOutTable.projectId, projectsTable.id))
    .leftJoin(departmentsTable, eq(stockOutTable.departmentId, departmentsTable.id))
    .leftJoin(usersTable, eq(stockOutTable.createdBy, usersTable.id))
    .where(eq(stockOutTable.id, params.data.id));

  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }

  const items = await db
    .select({
      id: stockOutItemsTable.id,
      itemId: stockOutItemsTable.itemId,
      itemCode: itemsTable.code,
      itemName: itemsTable.name,
      quantity: stockOutItemsTable.quantity,
      unitPrice: stockOutItemsTable.unitPrice,
      locationId: stockOutItemsTable.locationId,
      locationName: locationsTable.name,
      notes: stockOutItemsTable.notes,
    })
    .from(stockOutItemsTable)
    .leftJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
    .leftJoin(locationsTable, eq(stockOutItemsTable.locationId, locationsTable.id))
    .where(eq(stockOutItemsTable.stockOutId, params.data.id));

  res.json({
    ...header,
    transactionDate: header.transactionDate instanceof Date ? header.transactionDate.toISOString() : new Date(header.transactionDate).toISOString(),
    createdAt: header.createdAt instanceof Date ? header.createdAt.toISOString() : new Date(header.createdAt).toISOString(),
    items: items.map(i => ({ ...i, unitName: null, unitPrice: parseFloat(String(i.unitPrice)) })),
  });
});

router.post("/stock-out/:id/finalize", requireAuth, async (req, res): Promise<void> => {
  const params = FinalizeStockOutParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [header] = await db.select().from(stockOutTable).where(eq(stockOutTable.id, params.data.id));
  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  if (header.status === "finalized") { res.status(400).json({ error: "Sudah difinalisasi" }); return; }

  const items = await db.select().from(stockOutItemsTable).where(eq(stockOutItemsTable.stockOutId, header.id));

  for (const item of items) {
    const [current] = await db.select({ currentStock: itemsTable.currentStock }).from(itemsTable).where(eq(itemsTable.id, item.itemId));
    if (!current || current.currentStock < item.quantity) {
      res.status(400).json({ error: `Stok tidak mencukupi untuk item ID ${item.itemId}` });
      return;
    }
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      // 1. UPDATE items.currentStock
      const [current] = await tx.select({ currentStock: itemsTable.currentStock }).from(itemsTable).where(eq(itemsTable.id, item.itemId));
      await tx.update(itemsTable)
        .set({ currentStock: (current?.currentStock ?? 0) - item.quantity })
        .where(eq(itemsTable.id, item.itemId));
        
      // 2. FIFO BATCH ALLOCATION
      let remainingToDeduct = item.quantity;
      const batches = await tx.select()
        .from(itemBatchesTable)
        .where(eq(itemBatchesTable.itemId, item.itemId))
        .orderBy(asc(itemBatchesTable.receivedDate));
        
      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;
        if (batch.remainingQuantity <= 0) continue;
        
        const deductQty = Math.min(batch.remainingQuantity, remainingToDeduct);
        await tx.update(itemBatchesTable)
          .set({ remainingQuantity: batch.remainingQuantity - deductQty })
          .where(eq(itemBatchesTable.id, batch.id));
          
        await tx.insert(bppBatchAllocationsTable).values({
          stockOutItemId: item.id,
          itemBatchId: batch.id,
          allocatedQuantity: deductQty,
        });
        
        remainingToDeduct -= deductQty;
      }
      
      if (remainingToDeduct > 0) {
        throw new Error(`Kekurangan Batch FIFO: Masih butuh ${remainingToDeduct} unit untuk item ID ${item.itemId}`);
      }
    }
    await tx.update(stockOutTable).set({ status: "finalized" }).where(eq(stockOutTable.id, header.id));
  });

  await db.insert(auditLogsTable).values({
    entityType: "stock_out",
    entityId: header.id,
    action: "finalize",
    description: `Barang keluar ${header.referenceNo} difinalisasi`,
    userId: req.session.userId,
  });

  const [updated] = await db.select().from(stockOutTable).where(eq(stockOutTable.id, header.id));
  res.json(fmtStockOut(updated, { totalItems: items.length }));
});

export default router;
