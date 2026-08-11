import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { warehousesTable } from "./warehouses";
import { usersTable } from "./users";

export const mutationsTable = pgTable("mutations", {
  id: serial("id").primaryKey(),
  referenceNo: text("reference_no").notNull().unique(),
  fromWarehouseId: integer("from_warehouse_id").notNull().references(() => warehousesTable.id),
  toWarehouseId: integer("to_warehouse_id").notNull().references(() => warehousesTable.id),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const mutationItemsTable = pgTable("mutation_items", {
  id: serial("id").primaryKey(),
  mutationId: integer("mutation_id").notNull().references(() => mutationsTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMutationSchema = createInsertSchema(mutationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMutationItemSchema = createInsertSchema(mutationItemsTable).omit({ id: true, createdAt: true });
export type InsertMutation = z.infer<typeof insertMutationSchema>;
export type Mutation = typeof mutationsTable.$inferSelect;
export type MutationItem = typeof mutationItemsTable.$inferSelect;
