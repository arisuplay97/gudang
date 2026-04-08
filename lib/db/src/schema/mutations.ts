import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { locationsTable } from "./locations";
import { usersTable } from "./users";

export const mutationsTable = pgTable("mutations", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  fromLocationId: integer("from_location_id").references(() => locationsTable.id),
  toLocationId: integer("to_location_id").references(() => locationsTable.id),
  quantity: integer("quantity").notNull(),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMutationSchema = createInsertSchema(mutationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMutation = z.infer<typeof insertMutationSchema>;
export type Mutation = typeof mutationsTable.$inferSelect;
