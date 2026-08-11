import { pgTable, text, serial, timestamp, integer, uuid as pgUuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { materialTrackingTable } from "./material-tracking";
import { usersTable } from "./users";

/**
 * spi_findings — SPI inspection findings/issues.
 */
export const spiFindingsTable = pgTable("spi_findings", {
    id: serial("id").primaryKey(),
    uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
    branchId: integer("branch_id").references(() => branchesTable.id),
    relatedTrackingId: integer("related_tracking_id").references(() => materialTrackingTable.id),
    findingType: text("finding_type").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("OPEN"), // OPEN | RESOLVED | CLOSED
    reportedBy: integer("reported_by").notNull().references(() => usersTable.id),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [
    index("idx_spi_finding_branch").on(table.branchId),
    index("idx_spi_finding_status").on(table.status),
]);

export const insertSpiFindingSchema = createInsertSchema(spiFindingsTable).omit({ id: true, uuid: true, reportedAt: true });
export type InsertSpiFinding = z.infer<typeof insertSpiFindingSchema>;
export type SpiFinding = typeof spiFindingsTable.$inferSelect;
