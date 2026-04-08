import { Router, type Request, type Response, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, borrowingTable, borrowingItemsTable, insertBorrowingSchema, insertBorrowingItemSchema } from "@workspace/db";
import { usersTable, itemsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

function fmtBorrowing(row: any) {
  return {
    ...row,
    borrowDate: row.borrowDate instanceof Date ? row.borrowDate.toISOString() : row.borrowDate,
    dueDate: row.dueDate instanceof Date ? row.dueDate.toISOString() : row.dueDate,
    returnedDate: row.returnedDate instanceof Date ? row.returnedDate.toISOString() : row.returnedDate,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

router.get("/borrowing", requireAuth, (async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: borrowingTable.id,
      transactionNumber: borrowingTable.transactionNumber,
      borrowedBy: borrowingTable.borrowedBy,
      borrowedByName: usersTable.fullName,
      status: borrowingTable.status,
      notes: borrowingTable.notes,
      borrowDate: borrowingTable.borrowDate,
      dueDate: borrowingTable.dueDate,
      returnedDate: borrowingTable.returnedDate,
      createdAt: borrowingTable.createdAt,
    })
    .from(borrowingTable)
    .leftJoin(usersTable, eq(borrowingTable.borrowedBy, usersTable.id))
    .orderBy(borrowingTable.borrowDate);
  res.json(rows.map(fmtBorrowing));
}) as RequestHandler);

router.get("/borrowing/:id", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const [borrowing] = await db
    .select({ id: borrowingTable.id, transactionNumber: borrowingTable.transactionNumber, borrowedBy: borrowingTable.borrowedBy, borrowedByName: usersTable.fullName, status: borrowingTable.status, notes: borrowingTable.notes, borrowDate: borrowingTable.borrowDate, dueDate: borrowingTable.dueDate, returnedDate: borrowingTable.returnedDate, createdAt: borrowingTable.createdAt })
    .from(borrowingTable)
    .leftJoin(usersTable, eq(borrowingTable.borrowedBy, usersTable.id))
    .where(eq(borrowingTable.id, id));
  if (!borrowing) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db
    .select({ itemId: borrowingItemsTable.itemId, itemName: itemsTable.name, quantityBorrowed: borrowingItemsTable.quantityBorrowed, quantityReturned: borrowingItemsTable.quantityReturned, notes: borrowingItemsTable.notes })
    .from(borrowingItemsTable)
    .leftJoin(itemsTable, eq(borrowingItemsTable.itemId, itemsTable.id))
    .where(eq(borrowingItemsTable.borrowingId, id));
  res.json({ borrowing: fmtBorrowing(borrowing), items });
}) as RequestHandler);

router.post("/borrowing", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const { items, ...rest } = req.body;
  const parsed = insertBorrowingSchema.safeParse(rest);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Auto-generate transaction number
  const count = await db.select().from(borrowingTable);
  const num = String(count.length + 1).padStart(4, "0");
  const [borrowing] = await db.insert(borrowingTable).values({ ...parsed.data, transactionNumber: `BRW-${num}` }).returning();
  if (Array.isArray(items) && items.length > 0) {
    await db.insert(borrowingItemsTable).values(items.map((it: any) => ({ borrowingId: borrowing.id, itemId: it.itemId, quantityBorrowed: it.quantityBorrowed, quantityReturned: 0 })));
  }
  res.status(201).json(fmtBorrowing(borrowing));
}) as RequestHandler);

router.patch("/borrowing/:id", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = insertBorrowingSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(borrowingTable).set(parsed.data).where(eq(borrowingTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Borrowing transaction not found" });
    return;
  }
  res.json(fmtBorrowing(row));
}) as RequestHandler);

export default router;
