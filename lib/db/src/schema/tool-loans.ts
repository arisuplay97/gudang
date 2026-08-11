import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { departmentsTable } from "./departments";
import { warehousesTable } from "./warehouses";
import { usersTable } from "./users";

// status: borrowed | partial_returned | returned | overdue
export const toolLoansTable = pgTable("tool_loans", {
    id: serial("id").primaryKey(),
    referenceNo: text("reference_no").notNull().unique(),
    borrowerName: text("borrower_name").notNull(),
    departmentId: integer("department_id").references(() => departmentsTable.id),
    warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
    status: text("status").notNull().default("borrowed"),
    loanDate: timestamp("loan_date", { withTimezone: true }).notNull(),
    expectedReturnDate: timestamp("expected_return_date", { withTimezone: true }).notNull(),
    actualReturnDate: timestamp("actual_return_date", { withTimezone: true }),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index("idx_tool_loan_status").on(table.status),
    index("idx_tool_loan_date").on(table.loanDate),
]);

export const toolLoanItemsTable = pgTable("tool_loan_items", {
    id: serial("id").primaryKey(),
    toolLoanId: integer("tool_loan_id").notNull().references(() => toolLoansTable.id),
    itemId: integer("item_id").notNull().references(() => itemsTable.id),
    quantity: integer("quantity").notNull(),
    returnedQuantity: integer("returned_quantity").notNull().default(0),
    condition: text("condition").notNull().default("good"), // good | damaged
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertToolLoanSchema = createInsertSchema(toolLoansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertToolLoanItemSchema = createInsertSchema(toolLoanItemsTable).omit({ id: true, createdAt: true });
export type InsertToolLoan = z.infer<typeof insertToolLoanSchema>;
export type ToolLoan = typeof toolLoansTable.$inferSelect;
export type ToolLoanItem = typeof toolLoanItemsTable.$inferSelect;
