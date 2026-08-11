import { pgTable, text, serial, timestamp, integer, numeric, uuid as pgUuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";
import { usersTable } from "./users";
import { itemsTable } from "./items";
import { locationsTable } from "./locations";
import { warehousesTable } from "./warehouses";
import { branchesTable } from "./branches";

/**
 * stock_out — Warehouse outbound transactions (Barang Keluar).
 *
 * Blueprint status machine (Section 19): DRAFT → DIPROSES → DIKIRIM → DIBATALKAN
 * For TRACKED items, a QR token is generated (Section 8).
 */
export const stockOutTable = pgTable("stock_out", {
  id: serial("id").primaryKey(),
  uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
  referenceNo: text("reference_no").notNull().unique(), // e.g. BK-20260811-0025
  departmentId: integer("department_id").references(() => departmentsTable.id),
  warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
  // SI GAPLEK: destination branch for tracked materials
  destinationBranchId: integer("destination_branch_id").references(() => branchesTable.id),
  requestedBy: text("requested_by"),
  // Blueprint status: DRAFT | DIPROSES | DIKIRIM | DIBATALKAN
  status: text("status").notNull().default("DRAFT"),
  // Approval berjenjang
  approvalStatus: text("approval_status").notNull().default("draft"),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  // SI GAPLEK: QR token for tracked material transactions (Section 8)
  qrToken: text("qr_token").unique(),
  // SI GAPLEK: SLA starts from this timestamp (Section 18)
  releasedAt: timestamp("released_at", { withTimezone: true }),
  // Foto bukti surat jalan
  photoUrl: text("photo_url"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_stock_out_branch").on(table.destinationBranchId),
  index("idx_stock_out_status").on(table.status),
  index("idx_stock_out_qr_token").on(table.qrToken),
]);

export const stockOutItemsTable = pgTable("stock_out_items", {
  id: serial("id").primaryKey(),
  uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
  stockOutId: integer("stock_out_id").notNull().references(() => stockOutTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  locationId: integer("location_id").references(() => locationsTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStockOutSchema = createInsertSchema(stockOutTable).omit({ id: true, uuid: true, createdAt: true, updatedAt: true });
export const insertStockOutItemSchema = createInsertSchema(stockOutItemsTable).omit({ id: true, uuid: true, createdAt: true });
export type InsertStockOut = z.infer<typeof insertStockOutSchema>;
export type StockOut = typeof stockOutTable.$inferSelect;
export type StockOutItem = typeof stockOutItemsTable.$inferSelect;


