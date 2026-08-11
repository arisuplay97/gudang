// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, branchesTable } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

// ─── LIST BRANCHES ───
router.get("/branches", requireAuth, async (req, res): Promise<void> => {
    const rows = await db.select().from(branchesTable).orderBy(branchesTable.name);
    res.json({ data: rows });
});

// ─── CREATE BRANCH ───
router.post("/branches", requireAuth, requireRole("ADMIN", "GUDANG"), async (req, res): Promise<void> => {
    const { name, address, latitude, longitude } = req.body;
    if (!name) { res.status(400).json({ error: "Nama cabang wajib diisi" }); return; }

    const [branch] = await db.insert(branchesTable).values({
        name,
        address: address ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
    }).returning();

    res.status(201).json(branch);
});

// ─── UPDATE BRANCH ───
router.put("/branches/:id", requireAuth, requireRole("ADMIN", "GUDANG"), async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

    const { name, address, latitude, longitude, status } = req.body;
    const [updated] = await db.update(branchesTable).set({
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(status !== undefined && { status }),
    }).where(eq(branchesTable.id, id)).returning();

    if (!updated) { res.status(404).json({ error: "Cabang tidak ditemukan" }); return; }
    res.json(updated);
});

// ─── GET BRANCH ───
router.get("/branches/:id", requireAuth, async (req, res): Promise<void> => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, id));
    if (!branch) { res.status(404).json({ error: "Cabang tidak ditemukan" }); return; }
    res.json(branch);
});

export default router;
