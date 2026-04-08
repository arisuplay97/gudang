import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobTypesTable = pgTable("job_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobTypeSchema = createInsertSchema(jobTypesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobType = z.infer<typeof insertJobTypeSchema>;
export type JobType = typeof jobTypesTable.$inferSelect;
