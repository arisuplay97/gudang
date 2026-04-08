import { Router, type Request, type Response, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, entrustedGoodsTable, entrustedGoodsItemsTable, insertEntrustedGoodsSchema } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

function fmtEntrusted(row: any) {
  return {
    ...row,
    receivedDate: row.receivedDate instanceof Date ? row.receivedDate.toISOString() : row.receivedDate,
    takenDate: row.takenDate instanceof Date ? row.takenDate.toISOString() : row.takenDate,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

router.get("/entrusted-goods", requireAuth, (async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(entrustedGoodsTable).orderBy(entrustedGoodsTable.receivedDate);
  res.json(rows.map(fmtEntrusted));
}) as RequestHandler);

router.get("/entrusted-goods/:id", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [entrustedGoods] = await db.select().from(entrustedGoodsTable).where(eq(entrustedGoodsTable.id, id));
  if (!entrustedGoods) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(entrustedGoodsItemsTable).where(eq(entrustedGoodsItemsTable.entrustedGoodsId, id));
  res.json({ entrustedGoods: fmtEntrusted(entrustedGoods), items });
}) as RequestHandler);

router.post("/entrusted-goods", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const { items, ...rest } = req.body;
  const parsed = insertEntrustedGoodsSchema.safeParse(rest);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const count = await db.select().from(entrustedGoodsTable);
  const num = String(count.length + 1).padStart(4, "0");
  const now = new Date();
  const mmYYYY = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const [row] = await db.insert(entrustedGoodsTable).values({ ...parsed.data, transactionNumber: `TTP-${num}-${mmYYYY}` }).returning();
  if (Array.isArray(items) && items.length > 0) {
    await db.insert(entrustedGoodsItemsTable).values(items.map((it: any) => ({ entrustedGoodsId: row.id, itemName: it.itemName, quantity: it.quantity, condition: it.condition || "baik", notes: it.notes || null })));
  }
  res.status(201).json(fmtEntrusted(row));
}) as RequestHandler);

router.patch("/entrusted-goods/:id", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = insertEntrustedGoodsSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(entrustedGoodsTable).set(parsed.data).where(eq(entrustedGoodsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json(fmtEntrusted(row));
}) as RequestHandler);

export default router;
