import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { warehousesTable } from "./warehouses";
import { usersTable } from "./users";

export const adjustmentsTable = pgTable("adjustments", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
  adjustmentType: text("adjustment_type").notNull(), // increase | decrease | opname
  status: text("status").notNull().default("pending"), // pending | approved | posted | void
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const adjustmentItemsTable = pgTable("adjustment_items", {
  id: serial("id").primaryKey(),
  adjustmentId: integer("adjustment_id").notNull().references(() => adjustmentsTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAdjusted: integer("quantity_adjusted").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdjustmentSchema = createInsertSchema(adjustmentsTable).omit({ id: true, createdAt: true, updatedAt: true, approvedBy: true });
export const insertAdjustmentItemSchema = createInsertSchema(adjustmentItemsTable).omit({ id: true, createdAt: true });
export type InsertAdjustment = z.infer<typeof insertAdjustmentSchema>;
export type Adjustment = typeof adjustmentsTable.$inferSelect;
export type AdjustmentItem = typeof adjustmentItemsTable.$inferSelect;
