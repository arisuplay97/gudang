import { pgTable, serial, timestamp, integer, text, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { branchesTable } from "./branches";
import { usersTable } from "./users";

export const branchStockMovementsTable = pgTable("branch_stock_movements", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  movementDate: timestamp("movement_date", { withTimezone: true }).notNull().defaultNow(),
  // RECEIPT (Surat Jalan Masuk), INSTALLATION (Pemasangan Keluar), RETURN (Retur ke Pusat),
  // REJECTION_ROLLBACK (Pemasangan Ditolak SPI / Dikembalikan), ADJUSTMENT (Koreksi Opname), INITIAL (Saldo Awal)
  movementType: text("movement_type").notNull(),
  direction: text("direction").notNull(), // "in" (+) | "out" (-)
  quantity: integer("quantity").notNull(),
  balanceBefore: integer("balance_before").notNull().default(0),
  balanceAfter: integer("balance_after").notNull().default(0),
  referenceType: text("reference_type"), // stock_out, evidence, return, verification, opname
  referenceId: integer("reference_id"),
  referenceNo: text("reference_no"),
  userId: integer("user_id").references(() => usersTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_bsm_branch_item").on(table.branchId, table.itemId),
  index("idx_bsm_date").on(table.movementDate),
  index("idx_bsm_type").on(table.movementType),
  index("idx_bsm_ref").on(table.referenceType, table.referenceId),
]);

export const insertBranchStockMovementSchema = createInsertSchema(branchStockMovementsTable).omit({ id: true, createdAt: true });
export type InsertBranchStockMovement = z.infer<typeof insertBranchStockMovementSchema>;
export type BranchStockMovement = typeof branchStockMovementsTable.$inferSelect;
