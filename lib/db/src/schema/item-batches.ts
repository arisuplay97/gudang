import { pgTable, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { stockInTable } from "./stock-in";

export const itemBatchesTable = pgTable("item_batches", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  stockInId: integer("stock_in_id").references(() => stockInTable.id),
  receivedDate: timestamp("received_date", { withTimezone: true }).notNull().defaultNow(),
  initialQuantity: integer("initial_quantity").notNull(),
  remainingQuantity: integer("remaining_quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertItemBatchSchema = createInsertSchema(itemBatchesTable).omit({ id: true, createdAt: true });
export type InsertItemBatch = z.infer<typeof insertItemBatchSchema>;
export type ItemBatch = typeof itemBatchesTable.$inferSelect;
