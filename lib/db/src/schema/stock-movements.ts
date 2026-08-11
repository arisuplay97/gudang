import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { warehousesTable } from "./warehouses";
import { usersTable } from "./users";

// movementType: stock_in | stock_out | transfer_in | transfer_out | adjustment | opname | return_in | return_out | void
// direction: "in" (+) | "out" (-)
export const stockMovementsTable = pgTable("stock_movements", {
    id: serial("id").primaryKey(),
    movementDate: timestamp("movement_date", { withTimezone: true }).notNull().defaultNow(),
    movementType: text("movement_type").notNull(),
    itemId: integer("item_id").notNull().references(() => itemsTable.id),
    warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id),
    quantity: integer("quantity").notNull(),
    direction: text("direction").notNull(), // "in" or "out"
    balanceBefore: integer("balance_before").notNull().default(0),
    balanceAfter: integer("balance_after").notNull().default(0),
    referenceType: text("reference_type"), // stock_in, stock_out, mutation, adjustment, opname, return, tool_loan
    referenceId: integer("reference_id"),
    referenceNo: text("reference_no"),
    userId: integer("user_id").references(() => usersTable.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("idx_stock_movement_item").on(table.itemId),
    index("idx_stock_movement_warehouse").on(table.warehouseId),
    index("idx_stock_movement_date").on(table.movementDate),
    index("idx_stock_movement_type").on(table.movementType),
    index("idx_stock_movement_ref").on(table.referenceType, table.referenceId),
]);

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({ id: true, createdAt: true });
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
