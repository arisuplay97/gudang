import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const entrustedGoodsTable = pgTable("entrusted_goods", {
  id: serial("id").primaryKey(),
  transactionNumber: text("transaction_number").unique().notNull(),
  ownerName: text("owner_name").notNull(), // Siapa pemilik barang titipan
  contactInfo: text("contact_info"),
  status: text("status").notNull().default("active"), // active | taken
  notes: text("notes"),
  receivedBy: integer("received_by").references(() => usersTable.id),
  receivedDate: timestamp("received_date", { withTimezone: true }).notNull().defaultNow(),
  takenDate: timestamp("taken_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const entrustedGoodsItemsTable = pgTable("entrusted_goods_items", {
  id: serial("id").primaryKey(),
  entrustedGoodsId: integer("entrusted_goods_id").notNull().references(() => entrustedGoodsTable.id),
  itemName: text("item_name").notNull(), // Barang titipan bisa jadi bukan master item
  quantity: integer("quantity").notNull(),
  condition: text("condition").default("baik"),
  notes: text("notes"),
});

export const insertEntrustedGoodsSchema = createInsertSchema(entrustedGoodsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEntrustedGoods = z.infer<typeof insertEntrustedGoodsSchema>;
export type EntrustedGoods = typeof entrustedGoodsTable.$inferSelect;
