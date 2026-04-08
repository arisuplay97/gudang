// @ts-nocheck
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { CreateUserBody, UpdateUserBody, GetUserParams, UpdateUserParams, DeleteUserParams } from "@workspace/api-zod";
import { requireAuth, requireRole, hashPassword } from "../lib/auth";
import { db as dbInstance } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
const router = Router();
function formatUser(user) {
    return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
    };
}
router.get("/users", requireAuth, requireRole("admin"), async (req, res) => {
    const users = await db.select().from(usersTable).orderBy(usersTable.fullName);
    res.json(users.map(formatUser));
});
router.post("/users", requireAuth, requireRole("admin"), async (req, res) => {
    const parsed = CreateUserBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const { password, ...rest } = parsed.data;
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({ ...rest, passwordHash }).returning();
    await dbInstance.insert(auditLogsTable).values({
        entityType: "user",
        entityId: user.id,
        action: "create",
        description: `User ${user.username} dibuat`,
        userId: req.session.userId,
    });
    res.status(201).json(formatUser(user));
});
router.get("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    const params = GetUserParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
    if (!user) {
        res.status(404).json({ error: "User tidak ditemukan" });
        return;
    }
    res.json(formatUser(user));
});
router.patch("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    const params = UpdateUserParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const { password, ...rest } = parsed.data;
    const updateData = { ...rest };
    if (password) {
        updateData.passwordHash = await hashPassword(password);
    }
    const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, params.data.id)).returning();
    if (!user) {
        res.status(404).json({ error: "User tidak ditemukan" });
        return;
    }
    res.json(formatUser(user));
});
router.delete("/users/:id", requireAuth, requireRole("admin"), async (req, res) => {
    const params = DeleteUserParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
    res.sendStatus(204);
});
export default router;
