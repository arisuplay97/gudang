import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { warehousesTable } from "./warehouses";
import { itemsTable } from "./items";
import { usersTable } from "./users";

export const opnameTable = pgTable("opname", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const opnameItemsTable = pgTable("opname_items", {
  id: serial("id").primaryKey(),
  opnameId: integer("opname_id").notNull().references(() => opnameTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  systemQty: integer("system_qty").notNull(),
  actualQty: integer("actual_qty"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOpnameSchema = createInsertSchema(opnameTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOpnameItemSchema = createInsertSchema(opnameItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOpname = z.infer<typeof insertOpnameSchema>;
export type Opname = typeof opnameTable.$inferSelect;
export type OpnameItem = typeof opnameItemsTable.$inferSelect;
