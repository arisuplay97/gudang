import { pgTable, text, serial, timestamp, integer, jsonb, uuid as pgUuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { materialTrackingTable } from "./material-tracking";
import { usersTable } from "./users";

/**
 * material_tracking_events — append-only event log for tracking audit (Section 24).
 *
 * Event types:
 *   WAREHOUSE_RELEASED, BRANCH_RECEIVED, INSTALLATION_STARTED,
 *   INSTALLATION_COMPLETED, VERIFICATION_PENDING, VERIFIED, REJECTED,
 *   OVERDUE, ALLOCATION_CREATED, ALLOCATION_UPDATED, LOCATION_MISMATCH_FLAGGED
 */
export const materialTrackingEventsTable = pgTable("material_tracking_events", {
    id: serial("id").primaryKey(),
    uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
    trackingId: integer("tracking_id").notNull().references(() => materialTrackingTable.id),
    eventType: text("event_type").notNull(),
    eventTime: timestamp("event_time", { withTimezone: true }).notNull().defaultNow(),
    userId: integer("user_id").references(() => usersTable.id),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("idx_tracking_event_tracking").on(table.trackingId),
    index("idx_tracking_event_type").on(table.eventType),
    index("idx_tracking_event_time").on(table.eventTime),
]);

export const insertMaterialTrackingEventSchema = createInsertSchema(materialTrackingEventsTable).omit({ id: true, uuid: true, createdAt: true });
export type InsertMaterialTrackingEvent = z.infer<typeof insertMaterialTrackingEventSchema>;
export type MaterialTrackingEvent = typeof materialTrackingEventsTable.$inferSelect;
