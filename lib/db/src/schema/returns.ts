import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { usersTable } from "./users";
import { warehousesTable } from "./warehouses";

// type: from_field = dari lapangan ke gudang, to_supplier = kembalikan ke supplier
// condition: good = bisa dipakai, damaged = rusak/rongsokan
export const returnsTable = pgTable("returns", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  type: text("type").notNull().default("from_field"), // from_field | to_supplier
  warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const returnItemsTable = pgTable("return_items", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").notNull().references(() => returnsTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantity: integer("quantity").notNull(),
  condition: text("condition").notNull().default("good"), // good | damaged
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0"),
  serialNumber: text("serial_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReturnSchema = createInsertSchema(returnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReturnItemSchema = createInsertSchema(returnItemsTable).omit({ id: true, createdAt: true });
export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type Return = typeof returnsTable.$inferSelect;
export type ReturnItem = typeof returnItemsTable.$inferSelect;
