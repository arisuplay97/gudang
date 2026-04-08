// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { hashPassword, comparePassword, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
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

  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      res.status(500).json({ error: "Failed to save session" });
      return;
    }
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
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logout berhasil" });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!));
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

router.get("/auth/seed-users", async (req, res): Promise<void> => {
  try {
    const defaultPasswordHash = await hashPassword("password");
    const usersToSeed = [
      { username: "admin", fullName: "Administrator", role: "admin", passwordHash: defaultPasswordHash },
      { username: "gudang1", fullName: "Staf Gudang", role: "gudang", passwordHash: defaultPasswordHash },
      { username: "keuangan1", fullName: "Staf Keuangan", role: "keuangan", passwordHash: defaultPasswordHash },
      { username: "pimpinan1", fullName: "Pimpinan/Manajer", role: "pimpinan", passwordHash: defaultPasswordHash },
    ];
    
    let processedCounts = 0;
    for (const u of usersToSeed) {
      const existing = await db.select().from(usersTable).where(eq(usersTable.username, u.username));
      if (existing.length === 0) {
        await db.insert(usersTable).values(u);
      } else {
        await db.update(usersTable).set({ passwordHash: defaultPasswordHash }).where(eq(usersTable.username, u.username));
      }
      processedCounts++;
    }
    
    res.json({ message: `Sistem berhasil mereset dan membuat ulang ${processedCounts} kredensial dasar!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
