import { pgTable, text, serial, timestamp, integer, uuid as pgUuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { stockOutItemsTable } from "./stock-out";
import { branchesTable } from "./branches";
import { usersTable } from "./users";

/**
 * material_tracking — tracks each TRACKED item from warehouse release to SPI verification.
 *
 * Status state machine (Section 19):
 *   BARANG_KELUAR → MENUNGGU_DITERIMA → DITERIMA_CABANG → MENUNGGU_PEMASANGAN
 *   → TERPASANG → MENUNGGU_VERIFIKASI → TERVERIFIKASI
 *
 * Rejection: MENUNGGU_VERIFIKASI → DITOLAK → MENUNGGU_PEMASANGAN
 */
export const materialTrackingTable = pgTable("material_tracking", {
    id: serial("id").primaryKey(),
    uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
    transactionItemId: integer("transaction_item_id").notNull().references(() => stockOutItemsTable.id),
    branchId: integer("branch_id").notNull().references(() => branchesTable.id),
    status: text("status").notNull().default("BARANG_KELUAR"),
    // SLA (Section 18): starts from released_at on the transaction header
    slaStartAt: timestamp("sla_start_at", { withTimezone: true }),
    slaDeadlineAt: timestamp("sla_deadline_at", { withTimezone: true }),
    // Receipt
    receivedAt: timestamp("received_at", { withTimezone: true }),
    receivedBy: integer("received_by").references(() => usersTable.id),
    // Installation
    installedAt: timestamp("installed_at", { withTimezone: true }),
    installedBy: integer("installed_by").references(() => usersTable.id),
    // Verification
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: integer("verified_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index("idx_material_tracking_status").on(table.status),
    index("idx_material_tracking_branch").on(table.branchId),
    index("idx_material_tracking_item").on(table.transactionItemId),
]);

export const insertMaterialTrackingSchema = createInsertSchema(materialTrackingTable).omit({ id: true, uuid: true, createdAt: true, updatedAt: true });
export type InsertMaterialTracking = z.infer<typeof insertMaterialTrackingSchema>;
export type MaterialTracking = typeof materialTrackingTable.$inferSelect;
