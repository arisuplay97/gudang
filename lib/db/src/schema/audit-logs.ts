import { pgTable, text, serial, timestamp, integer, jsonb, uuid as pgUuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/**
 * audit_logs — immutable audit trail (Section 24).
 * Application role must not UPDATE/DELETE audit events.
 */
export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
  entityType: text("entity_type").notNull(), // table_name
  entityId: integer("entity_id"),
  recordUuid: text("record_uuid"), // UUID of the record being audited
  action: text("action").notNull(),
  description: text("description").notNull(),
  userId: integer("user_id").references(() => usersTable.id),
  username: text("username"),
  ipAddress: text("ip_address"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, uuid: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;


