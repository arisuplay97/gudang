import { Router, type Request, type Response, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, jobTypesTable, insertJobTypeSchema } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router = Router();

function fmtJobType(row: any) {
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  };
}

router.get("/job-types", requireAuth, (async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(jobTypesTable).orderBy(jobTypesTable.name);
  res.json(rows.map(fmtJobType));
}) as RequestHandler);

router.post("/job-types", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const parsed = insertJobTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(jobTypesTable).values(parsed.data).returning();
  res.status(201).json(fmtJobType(row));
}) as RequestHandler);

router.patch("/job-types/:id", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = insertJobTypeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(jobTypesTable).set(parsed.data).where(eq(jobTypesTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Job Type not found" });
    return;
  }
  res.json(fmtJobType(row));
}) as RequestHandler);

router.delete("/job-types/:id", requireAuth, (async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [deleted] = await db.delete(jobTypesTable).where(eq(jobTypesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Job Type not found" });
    return;
  }
  res.sendStatus(204);
}) as RequestHandler);

export default router;
