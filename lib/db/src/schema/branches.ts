import { pgTable, text, serial, timestamp, numeric, uuid as pgUuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const branchesTable = pgTable("branches", {
    id: serial("id").primaryKey(),
    uuid: pgUuid("uuid").notNull().unique().defaultRandom(),
    name: text("name").notNull(),
    address: text("address"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    status: text("status").notNull().default("active"), // active | inactive
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ id: true, uuid: true, createdAt: true, updatedAt: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
