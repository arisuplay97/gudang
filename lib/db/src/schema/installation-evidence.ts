import { pgTable, text, serial, timestamp, integer, numeric, boolean, uuid as pgUuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { installationAllocationsTable } from "./installation-allocations";
import { materialTrackingTable } from "./material-tracking";
import { branchesTable } from "./branches";
import { usersTable } from "./users";

/**
 * installation_evidence — photo + GPS proof of material installation.
 *
 * Section 10 (watermark), Section 13 (evidence→allocation), Section 14 (planned vs actual),
 * Section 15 (location mismatch), Section 25 (evidence integrity).
 *
 * Status: PENDING | TERVERIFIKASI | DITOLAK
 */
export const installationEvidenceTable = pgTable("installation_evidence", {
    id: serial("id").primaryKey(),
    uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
    allocationId: integer("allocation_id").notNull().references(() => installationAllocationsTable.id),
    trackingId: integer("tracking_id").notNull().references(() => materialTrackingTable.id), // denormalized for quick lookup
    attemptNumber: integer("attempt_number").notNull().default(1),
    // Photo (Section 25)
    photoUrl: text("photo_url").notNull(),
    originalPhotoUrl: text("original_photo_url").notNull(),
    photoChecksum: text("photo_checksum").notNull(), // SHA-256
    // GPS (Section 9.3)
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    gpsAccuracy: numeric("gps_accuracy", { precision: 8, scale: 2 }),
    // Timestamps
    clientCaptureTime: timestamp("client_capture_time", { withTimezone: true }),
    serverReceivedAt: timestamp("server_received_at", { withTimezone: true }).notNull().defaultNow(),
    // Who
    capturedBy: integer("captured_by").notNull().references(() => usersTable.id),
    branchId: integer("branch_id").notNull().references(() => branchesTable.id),
    // Verification status
    status: text("status").notNull().default("PENDING"), // PENDING | TERVERIFIKASI | DITOLAK
    rejectionReason: text("rejection_reason"),
    // Location mismatch (Section 15)
    locationMismatch: boolean("location_mismatch").default(false),
    locationDeviationMeters: numeric("location_deviation_meters", { precision: 10, scale: 2 }),
    mismatchThresholdMeters: numeric("mismatch_threshold_meters", { precision: 10, scale: 2 }),
    // Idempotency
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("idx_evidence_allocation").on(table.allocationId),
    index("idx_evidence_tracking").on(table.trackingId),
    index("idx_evidence_status").on(table.status),
    index("idx_evidence_branch").on(table.branchId),
]);

export const insertInstallationEvidenceSchema = createInsertSchema(installationEvidenceTable).omit({ id: true, uuid: true, createdAt: true, serverReceivedAt: true });
export type InsertInstallationEvidence = z.infer<typeof insertInstallationEvidenceSchema>;
export type InstallationEvidence = typeof installationEvidenceTable.$inferSelect;
