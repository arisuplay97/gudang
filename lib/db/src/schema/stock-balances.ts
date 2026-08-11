import { pgTable, text, serial, timestamp, integer, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { warehousesTable } from "./warehouses";

export const stockBalancesTable = pgTable("stock_balances", {
    id: serial("id").primaryKey(),
    itemId: integer("item_id").notNull().references(() => itemsTable.id),
    warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id),
    quantity: integer("quantity").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    unique("uq_stock_balance_item_warehouse").on(table.itemId, table.warehouseId),
    index("idx_stock_balance_item").on(table.itemId),
    index("idx_stock_balance_warehouse").on(table.warehouseId),
]);

export const insertStockBalanceSchema = createInsertSchema(stockBalancesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStockBalance = z.infer<typeof insertStockBalanceSchema>;
export type StockBalance = typeof stockBalancesTable.$inferSelect;
