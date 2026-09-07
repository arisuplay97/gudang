// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, branchesTable, auditLogsTable } from "@workspace/db";
import { GetUserParams, UpdateUserParams, DeleteUserParams } from "@workspace/api-zod";
import { requireAuth, requireRole, hashPassword, comparePassword } from "../lib/auth";

const router: IRouter = Router();

function formatUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email ?? null,
    role: (user.role ?? "GUDANG").toUpperCase(),
    branchId: user.branchId ?? null,
    branchName: user.branchName ?? null,
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt || new Date().toISOString()),
  };
}

// ── GET /users (List all users with branch name) ──
router.get("/users", requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      email: usersTable.email,
      role: usersTable.role,
      branchId: usersTable.branchId,
      branchName: branchesTable.name,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(branchesTable, eq(usersTable.branchId, branchesTable.id))
    .orderBy(usersTable.fullName);

  res.json(users.map(formatUser));
});

// ── POST /users (Create new user) ──
router.post("/users", requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  const { username, password, fullName, email, role, branchId, isActive } = req.body;

  if (!username || !password || !fullName) {
    res.status(400).json({ error: "Username, password, dan nama lengkap wajib diisi." });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username.trim().toLowerCase()));
  if (existing.length > 0) {
    res.status(400).json({ error: `Username "${username}" sudah digunakan.` });
    return;
  }

  const normalizedRole = (role || "GUDANG").toUpperCase();
  const passwordHash = await hashPassword(password);

  const [user] = await db.insert(usersTable).values({
    username: username.trim().toLowerCase(),
    fullName: fullName.trim(),
    email: email ? String(email).trim() : null,
    role: normalizedRole,
    branchId: normalizedRole === "CABANG" && branchId ? Number(branchId) : null,
    passwordHash,
    isActive: isActive !== false,
  }).returning();

  await db.insert(auditLogsTable).values({
    entityType: "user",
    entityId: user.id,
    action: "create",
    description: `User ${user.username} (${user.role}) dibuat`,
    userId: req.session.userId,
  });

  res.status(201).json(formatUser(user));
});

// ── GET /users/:id (Detail user) ──
router.get("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      fullName: usersTable.fullName,
      email: usersTable.email,
      role: usersTable.role,
      branchId: usersTable.branchId,
      branchName: branchesTable.name,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .leftJoin(branchesTable, eq(usersTable.branchId, branchesTable.id))
    .where(eq(usersTable.id, params.data.id));

  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }
  res.json(formatUser(user));
});

// ── PATCH /users/:id (Update user by admin) ──
router.patch("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { fullName, email, role, branchId, isActive, password } = req.body;
  const updateData: Record<string, unknown> = {};

  if (fullName !== undefined) updateData.fullName = String(fullName).trim();
  if (email !== undefined) updateData.email = email ? String(email).trim() : null;
  if (role !== undefined) {
    const normalizedRole = String(role).toUpperCase();
    updateData.role = normalizedRole;
    if (normalizedRole === "CABANG") {
      updateData.branchId = branchId ? Number(branchId) : null;
    } else {
      updateData.branchId = null;
    }
  } else if (branchId !== undefined) {
    updateData.branchId = branchId ? Number(branchId) : null;
  }
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (password && String(password).trim().length > 0) {
    updateData.passwordHash = await hashPassword(String(password).trim());
  }

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  await db.insert(auditLogsTable).values({
    entityType: "user",
    entityId: user.id,
    action: "update",
    description: `Data user ${user.username} diperbarui`,
    userId: req.session.userId,
  });

  res.json(formatUser(user));
});

// ── DELETE /users/:id (Delete user) ──
router.delete("/users/:id", requireAuth, requireRole("ADMIN"), async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (Number(params.data.id) === Number(req.session.userId)) {
    res.status(400).json({ error: "Tidak dapat menghapus akun yang sedang Anda gunakan." });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.sendStatus(204);
});

// ── PATCH /users/profile/me (Current user update self profile) ──
router.patch("/users/profile/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId;
  const { fullName, email } = req.body;

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    res.status(400).json({ error: "Nama lengkap wajib diisi." });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({
      fullName: fullName.trim(),
      email: email ? String(email).trim() : null,
    })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json(formatUser(updated));
});

// ── POST /users/change-password/me (Current user change password) ──
router.post("/users/change-password/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: "Password lama dan password baru wajib diisi." });
    return;
  }
  if (String(newPassword).length < 6) {
    res.status(400).json({ error: "Password baru minimal 6 karakter." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan." });
    return;
  }

  const valid = await comparePassword(oldPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Password lama yang Anda masukkan salah." });
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));

  res.json({ success: true, message: "Password berhasil diperbarui." });
});

export default router;
