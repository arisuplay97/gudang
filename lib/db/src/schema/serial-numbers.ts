import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { usersTable } from "./users";

// Status: available = di gudang, deployed = sudah dipasang, scrapped = rusak/rongsokan
export const serialNumbersTable = pgTable("serial_numbers", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  serialNumber: text("serial_number").notNull().unique(),
  status: text("status").notNull().default("available"), // available | deployed | scrapped
  deployedTo: text("deployed_to"),       // nama lokasi pemasangan, misal: "Jl. Merdeka No. 5"
  stockInItemId: integer("stock_in_item_id"),  // referensi penerimaan barang asal
  stockOutItemId: integer("stock_out_item_id"), // referensi pengeluaran barang
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSerialNumberSchema = createInsertSchema(serialNumbersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSerialNumber = z.infer<typeof insertSerialNumberSchema>;
export type SerialNumber = typeof serialNumbersTable.$inferSelect;
