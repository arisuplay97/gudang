import { pgTable, text, serial, timestamp, integer, boolean, uuid as pgUuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Note: branch_id FK is added as a plain integer here to avoid circular imports.
// The branches table references this file. The FK constraint will be added at migration level.
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("GUDANG"), // GUDANG | CABANG | SPI | ADMIN
  branchId: integer("branch_id"), // FK to branches - set for CABANG users
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, uuid: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
