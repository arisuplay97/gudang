import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable, insertProjectSchema } from "@workspace/db";
import { requireAuth } from "../lib/auth";


const router: IRouter = Router();

function fmtProject(row: any) {
  return {
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  };
}

router.get("/projects", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(projectsTable).orderBy(projectsTable.name);
  res.json(rows.map(fmtProject));
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const parsed = insertProjectSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(projectsTable).values(parsed.data).returning();
  res.status(201).json(fmtProject(row));
});

router.patch("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = insertProjectSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(projectsTable).set(parsed.data).where(eq(projectsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(fmtProject(row));
});

router.delete("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [deleted] = await db.delete(projectsTable).where(eq(projectsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
