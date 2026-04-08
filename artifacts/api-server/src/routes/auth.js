// @ts-nocheck
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { comparePassword, requireAuth } from "../lib/auth";
const router = Router();
router.post("/auth/login", async (req, res) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const { username, password } = parsed.data;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    if (!user || !user.isActive) {
        res.status(401).json({ error: "Username atau password salah" });
        return;
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: "Username atau password salah" });
        return;
    }
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    res.json({
        user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
        },
        message: "Login berhasil",
    });
});
router.post("/auth/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ message: "Logout berhasil" });
    });
});
router.get("/auth/me", requireAuth, async (req, res) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId));
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
    });
});
export default router;
