import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";
import { usersTable } from "./users";
import { itemsTable } from "./items";
import { locationsTable } from "./locations";

// status: draft | pending | approved | released
export const stockOutTable = pgTable("stock_out", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  departmentId: integer("department_id").references(() => departmentsTable.id),
  requestedBy: text("requested_by"),
  status: text("status").notNull().default("draft"),
  // Approval berjenjang
  approvalStatus: text("approval_status").notNull().default("draft"), // draft | pending | approved | released
  approvedBy: integer("approved_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  // Foto bukti surat jalan
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const stockOutItemsTable = pgTable("stock_out_items", {
  id: serial("id").primaryKey(),
  stockOutId: integer("stock_out_id").notNull().references(() => stockOutTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  locationId: integer("location_id").references(() => locationsTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockOutSchema = createInsertSchema(stockOutTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStockOutItemSchema = createInsertSchema(stockOutItemsTable).omit({ id: true, createdAt: true });
export type InsertStockOut = z.infer<typeof insertStockOutSchema>;
export type StockOut = typeof stockOutTable.$inferSelect;
export type StockOutItem = typeof stockOutItemsTable.$inferSelect;

