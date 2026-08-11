import { pgTable, text, serial, timestamp, integer, numeric, boolean, uuid as pgUuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { unitsTable } from "./units";
import { suppliersTable } from "./suppliers";
import { racksTable } from "./racks";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  barcode: text("barcode").unique(),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  unitId: integer("unit_id").references(() => unitsTable.id),
  description: text("description"),
  minimumStock: integer("minimum_stock").notNull().default(0),
  maximumStock: integer("maximum_stock").notNull().default(0),
  currentStock: integer("current_stock").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  // Lokasi rak spesifik
  rackId: integer("rack_id").references(() => racksTable.id),
  // SI GAPLEK: TRACKED = perlu QR/evidence/GIS, NON_TRACKED = barang operasional biasa
  trackingType: text("tracking_type").notNull().default("NON_TRACKED"), // TRACKED | NON_TRACKED
  // Tracking serial number (khusus barang seperti Meteran Air)
  trackSerialNumber: boolean("track_serial_number").notNull().default(false),
  // Konversi satuan (misal: beli per Lonjor, keluar per Meter)
  secondaryUnitId: integer("secondary_unit_id").references(() => unitsTable.id),
  conversionFactor: numeric("conversion_factor", { precision: 10, scale: 4 }).default("1"),
  status: text("status").notNull().default("active"), // active | inactive
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true, uuid: true, createdAt: true, updatedAt: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
