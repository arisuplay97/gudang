// @ts-nocheck
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, branchesTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { hashPassword, comparePassword, requireAuth } from "../lib/auth";
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
    req.session.branchId = user.branchId;
    req.session.save(async (err) => {
        if (err) {
            console.error("Session save error:", err);
            res.status(500).json({ error: "Gagal menyimpan sesi" });
            return;
        }
        let branchName = null;
        if (user.branchId) {
            const [b] = await db.select().from(branchesTable).where(eq(branchesTable.id, user.branchId));
            branchName = b?.name ?? null;
        }
        res.json({
            user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                branchId: user.branchId,
                branchName: branchName,
                isActive: user.isActive,
                createdAt: user.createdAt.toISOString(),
            },
            message: "Login berhasil",
        });
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
    let branchName = null;
    if (user.branchId) {
        const [b] = await db.select().from(branchesTable).where(eq(branchesTable.id, user.branchId));
        branchName = b?.name ?? null;
    }
    res.json({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: branchName,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
    });
});
router.get("/auth/seed-users", async (req, res) => {
    try {
        const defaultPasswordHash = await hashPassword("password");
        const usersToSeed = [
            { username: "admin", fullName: "Administrator Server", role: "ADMIN", passwordHash: defaultPasswordHash },
            { username: "gudang", fullName: "Admin Gudang Pusat", role: "GUDANG", passwordHash: defaultPasswordHash },
            { username: "cabang_utara", fullName: "Admin Cabang Utara", role: "CABANG", passwordHash: defaultPasswordHash }, // Note: branchId should be assigned manually later
            { username: "spi", fullName: "Auditor SPI", role: "SPI", passwordHash: defaultPasswordHash },
        ];
        let processedCounts = 0;
        for (const u of usersToSeed) {
            const existing = await db.select().from(usersTable).where(eq(usersTable.username, u.username));
            if (existing.length === 0) {
                await db.insert(usersTable).values(u);
            }
            else {
                await db.update(usersTable).set({ passwordHash: defaultPasswordHash }).where(eq(usersTable.username, u.username));
            }
            processedCounts++;
        }
        res.json({ message: `Sistem berhasil mereset dan membuat ulang ${processedCounts} kredensial dasar!` });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;
