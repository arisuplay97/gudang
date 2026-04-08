import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { itemsTable } from "./items";

export const borrowingTable = pgTable("borrowing", {
  id: serial("id").primaryKey(),
  transactionNumber: text("transaction_number").unique().notNull(), // e.g. BRW-0001
  borrowedBy: integer("borrowed_by").references(() => usersTable.id).notNull(),
  status: text("status").notNull().default("borrowed"), // borrowed | partially_returned | returned | overdue
  notes: text("notes"),
  borrowDate: timestamp("borrow_date", { withTimezone: true }).notNull().defaultNow(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  returnedDate: timestamp("returned_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const borrowingItemsTable = pgTable("borrowing_items", {
  id: serial("id").primaryKey(),
  borrowingId: integer("borrowing_id").notNull().references(() => borrowingTable.id),
  itemId: integer("item_id").notNull().references(() => itemsTable.id),
  quantityBorrowed: integer("quantity_borrowed").notNull(),
  quantityReturned: integer("quantity_returned").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBorrowingSchema = createInsertSchema(borrowingTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBorrowingItemSchema = createInsertSchema(borrowingItemsTable).omit({ id: true, createdAt: true });

export type InsertBorrowing = z.infer<typeof insertBorrowingSchema>;
export type Borrowing = typeof borrowingTable.$inferSelect;
export type BorrowingItem = typeof borrowingItemsTable.$inferSelect;
