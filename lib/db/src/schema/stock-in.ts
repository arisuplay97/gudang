import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { usersTable } from "./users";
import { itemsTable } from "./items";
import { locationsTable } from "./locations";

export const stockInTable = pgTable("stock_in", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  status: text("status").notNull().default("draft"),
  // Foto bukti LPB (Laporan Penerimaan Barang)
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const stockInItemsTable = pgTable("stock_in_items", {
  id: serial("id").primaryKey(),
  stockInId: integer("stock_in_id").notNull().references(() => stockInTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  locationId: integer("location_id").references(() => locationsTable.id),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockInSchema = createInsertSchema(stockInTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStockInItemSchema = createInsertSchema(stockInItemsTable).omit({ id: true, createdAt: true });
export type InsertStockIn = z.infer<typeof insertStockInSchema>;
export type StockIn = typeof stockInTable.$inferSelect;
export type StockInItem = typeof stockInItemsTable.$inferSelect;

