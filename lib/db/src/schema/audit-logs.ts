import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // items | stock_in | stock_out | users | returns
  entityId: integer("entity_id"),
  action: text("action").notNull(),          // create | update | delete | approve | login | logout
  description: text("description").notNull(),
  userId: integer("user_id").references(() => usersTable.id),
  username: text("username"),               // cache nama user saat log dibuat
  ipAddress: text("ip_address"),
  oldValues: jsonb("old_values"),           // nilai sebelum perubahan
  newValues: jsonb("new_values"),           // nilai sesudah perubahan
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;

