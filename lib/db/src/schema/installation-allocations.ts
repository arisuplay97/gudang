import { pgTable, text, serial, timestamp, integer, numeric, uuid as pgUuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { materialTrackingTable } from "./material-tracking";
import { usersTable } from "./users";

/**
 * installation_allocations — one tracked item can be installed at multiple locations.
 *
 * Section 12: SUM(allocations.quantity) must not exceed the transaction item quantity.
 * Backend must use transaction + row lock to prevent race conditions (Section 27).
 */
export const installationAllocationsTable = pgTable("installation_allocations", {
    id: serial("id").primaryKey(),
    uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
    trackingId: integer("tracking_id").notNull().references(() => materialTrackingTable.id),
    quantity: integer("quantity").notNull(),
    // Planned location (Section 14)
    plannedLatitude: numeric("planned_latitude", { precision: 10, scale: 7 }),
    plannedLongitude: numeric("planned_longitude", { precision: 10, scale: 7 }),
    status: text("status").notNull().default("PENDING"), // PENDING | INSTALLED | VERIFIED | REJECTED
    createdBy: integer("created_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index("idx_allocation_tracking").on(table.trackingId),
]);

export const insertInstallationAllocationSchema = createInsertSchema(installationAllocationsTable).omit({ id: true, uuid: true, createdAt: true, updatedAt: true });
export type InsertInstallationAllocation = z.infer<typeof insertInstallationAllocationSchema>;
export type InstallationAllocation = typeof installationAllocationsTable.$inferSelect;
