// @ts-nocheck
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, mutationsTable, itemsTable, locationsTable, usersTable, auditLogsTable } from "@workspace/db";
import { CreateMutationBody, ListMutationsQueryParams, FinalizeMutationParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
const router = Router();
async function fmtMutation(row) {
    const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, row.itemId));
    const [fromLoc] = row.fromLocationId ? await db.select().from(locationsTable).where(eq(locationsTable.id, row.fromLocationId)) : [null];
    const [toLoc] = row.toLocationId ? await db.select().from(locationsTable).where(eq(locationsTable.id, row.toLocationId)) : [null];
    const [user] = row.createdBy ? await db.select().from(usersTable).where(eq(usersTable.id, row.createdBy)) : [null];
    return {
        id: row.id,
        referenceNo: row.referenceNo,
        itemId: row.itemId,
        itemName: item?.name ?? "",
        itemCode: item?.code ?? "",
        fromLocationId: row.fromLocationId,
        fromLocationName: fromLoc?.name ?? null,
        toLocationId: row.toLocationId,
        toLocationName: toLoc?.name ?? null,
        quantity: row.quantity,
        status: row.status,
        notes: row.notes,
        createdByName: user?.fullName ?? null,
        transactionDate: row.transactionDate.toISOString(),
        createdAt: row.createdAt.toISOString(),
    };
}
router.get("/mutations", requireAuth, async (req, res) => {
    const qp = ListMutationsQueryParams.safeParse(req.query);
    let rows = await db.select().from(mutationsTable).orderBy(mutationsTable.createdAt);
    if (qp.success && qp.data.status) {
        rows = rows.filter(r => r.status === qp.data.status);
    }
    const result = await Promise.all(rows.map(fmtMutation));
    res.json(result);
});
router.post("/mutations", requireAuth, async (req, res) => {
    const parsed = CreateMutationBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const refNo = generateRefNo("MUT");
    const [row] = await db.insert(mutationsTable).values({
        referenceNo: refNo,
        itemId: parsed.data.itemId,
        fromLocationId: parsed.data.fromLocationId ?? null,
        toLocationId: parsed.data.toLocationId ?? null,
        quantity: parsed.data.quantity,
        notes: parsed.data.notes ?? null,
        createdBy: req.session.userId ?? null,
        transactionDate: new Date(parsed.data.transactionDate),
        status: "draft",
    }).returning();
    res.status(201).json(await fmtMutation(row));
});
router.post("/mutations/:id/finalize", requireAuth, async (req, res) => {
    const params = FinalizeMutationParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [row] = await db.select().from(mutationsTable).where(eq(mutationsTable.id, params.data.id));
    if (!row) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    if (row.status === "finalized") {
        res.status(400).json({ error: "Sudah difinalisasi" });
        return;
    }
    await db.update(mutationsTable).set({ status: "finalized" }).where(eq(mutationsTable.id, row.id));
    await db.insert(auditLogsTable).values({
        entityType: "mutation",
        entityId: row.id,
        action: "finalize",
        description: `Mutasi ${row.referenceNo} difinalisasi`,
        userId: req.session.userId,
    });
    const [updated] = await db.select().from(mutationsTable).where(eq(mutationsTable.id, row.id));
    res.json(await fmtMutation(updated));
});
export default router;
