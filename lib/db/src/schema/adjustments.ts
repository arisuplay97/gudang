import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { usersTable } from "./users";

export const adjustmentsTable = pgTable("adjustments", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  adjustmentType: text("adjustment_type").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAdjusted: integer("quantity_adjusted").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAdjustmentSchema = createInsertSchema(adjustmentsTable).omit({ id: true, createdAt: true, updatedAt: true, approvedBy: true });
export type InsertAdjustment = z.infer<typeof insertAdjustmentSchema>;
export type Adjustment = typeof adjustmentsTable.$inferSelect;
