import { pgTable, text, serial, timestamp, integer, uuid as pgUuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { stockOutTable } from "./stock-out";
import { branchesTable } from "./branches";
import { usersTable } from "./users";

/**
 * material_receipts — records branch confirmation of receiving tracked materials.
 *
 * Per blueprint Section 9.1 / Section 21:
 * - One receipt per QR scan (one per transaction header)
 * - NO location (geom/lat/lon) — receipt location is never a GIS point
 * - Validated: token valid, transaction active, branch matches, not duplicate
 */
export const materialReceiptsTable = pgTable("material_receipts", {
    id: serial("id").primaryKey(),
    uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
    transactionId: integer("transaction_id").notNull().references(() => stockOutTable.id),
    qrToken: text("qr_token").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    receivedBy: integer("received_by").notNull().references(() => usersTable.id),
    branchId: integer("branch_id").notNull().references(() => branchesTable.id),
    idempotencyKey: text("idempotency_key").unique(), // Section 26
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("idx_material_receipt_transaction").on(table.transactionId),
    index("idx_material_receipt_branch").on(table.branchId),
]);

export const insertMaterialReceiptSchema = createInsertSchema(materialReceiptsTable).omit({ id: true, uuid: true, createdAt: true });
export type InsertMaterialReceipt = z.infer<typeof insertMaterialReceiptSchema>;
export type MaterialReceipt = typeof materialReceiptsTable.$inferSelect;
