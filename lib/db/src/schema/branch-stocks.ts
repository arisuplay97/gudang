import { pgTable, serial, timestamp, integer, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { branchesTable } from "./branches";

export const branchStocksTable = pgTable("branch_stocks", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantity: integer("quantity").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("uq_branch_stock_branch_item").on(table.branchId, table.itemId),
  index("idx_branch_stock_branch").on(table.branchId),
  index("idx_branch_stock_item").on(table.itemId),
]);

export const insertBranchStockSchema = createInsertSchema(branchStocksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBranchStock = z.infer<typeof insertBranchStockSchema>;
export type BranchStock = typeof branchStocksTable.$inferSelect;
