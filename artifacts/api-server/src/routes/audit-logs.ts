// @ts-nocheck
import { Router, type IRouter } from "express";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { db, auditLogsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// GET /audit-logs — log aktivitas semua user
router.get("/audit-logs", requireAuth, async (req, res): Promise<void> => {
  const { userId, entityType, action, from, to, limit = "100" } = req.query as any;

  let query = db
    .select({
      id: auditLogsTable.id,
      entityType: auditLogsTable.entityType,
      entityId: auditLogsTable.entityId,
      action: auditLogsTable.action,
      description: auditLogsTable.description,
      userId: auditLogsTable.userId,
      username: auditLogsTable.username,
      ipAddress: auditLogsTable.ipAddress,
      oldValues: auditLogsTable.oldValues,
      newValues: auditLogsTable.newValues,
      createdAt: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(parseInt(limit) || 100);

  const rows = await query;

  let filtered = rows;
  if (userId) filtered = filtered.filter(r => r.userId === parseInt(userId));
  if (entityType) filtered = filtered.filter(r => r.entityType === entityType);
  if (action) filtered = filtered.filter(r => r.action === action);
  if (from) filtered = filtered.filter(r => r.createdAt >= new Date(from));
  if (to) filtered = filtered.filter(r => r.createdAt <= new Date(to));

  res.json(filtered.map(r => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  })));
});

export default router;
