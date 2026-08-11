import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { locationsTable } from "./locations";

export const racksTable = pgTable("racks", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locationsTable.id),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // e.g. RAK-A1
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRackSchema = createInsertSchema(racksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRack = z.infer<typeof insertRackSchema>;
export type Rack = typeof racksTable.$inferSelect;
