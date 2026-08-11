import { pgTable, text, serial, timestamp, integer, numeric, uuid as pgUuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { materialTrackingTable } from "./material-tracking";
import { installationEvidenceTable } from "./installation-evidence";
import { usersTable } from "./users";

/**
 * material_verifications — SPI verification records.
 *
 * Section 14/35: verified_geom is a snapshot of evidence GPS at verification time.
 * Must not be edited manually or filled with estimates.
 */
export const materialVerificationsTable = pgTable("material_verifications", {
    id: serial("id").primaryKey(),
    uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
    trackingId: integer("tracking_id").notNull().references(() => materialTrackingTable.id),
    evidenceId: integer("evidence_id").notNull().references(() => installationEvidenceTable.id),
    verifiedBy: integer("verified_by").notNull().references(() => usersTable.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
    // Snapshot of verified evidence location (Section 35)
    verifiedLatitude: numeric("verified_latitude", { precision: 10, scale: 7 }),
    verifiedLongitude: numeric("verified_longitude", { precision: 10, scale: 7 }),
    status: text("status").notNull(), // TERVERIFIKASI | DITOLAK
    notes: text("notes"),
}, (table) => [
    index("idx_verification_tracking").on(table.trackingId),
    index("idx_verification_evidence").on(table.evidenceId),
]);

export const insertMaterialVerificationSchema = createInsertSchema(materialVerificationsTable).omit({ id: true, uuid: true, verifiedAt: true });
export type InsertMaterialVerification = z.infer<typeof insertMaterialVerificationSchema>;
export type MaterialVerification = typeof materialVerificationsTable.$inferSelect;
