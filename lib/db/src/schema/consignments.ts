import { pgTable, text, serial, timestamp, integer, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { suppliersTable } from "./suppliers";
import { warehousesTable } from "./warehouses";
import { usersTable } from "./users";

// status: active | returned | converted | expired
export const consignmentsTable = pgTable("consignments", {
    id: serial("id").primaryKey(),
    referenceNo: text("reference_no").notNull().unique(),
    itemId: integer("item_id").notNull().references(() => itemsTable.id),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).default("0"),
    supplierId: integer("supplier_id").references(() => suppliersTable.id),
    warehouseId: integer("warehouse_id").references(() => warehousesTable.id),
    receivedDate: timestamp("received_date", { withTimezone: true }).notNull(),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => usersTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index("idx_consignment_status").on(table.status),
    index("idx_consignment_item").on(table.itemId),
]);

export const insertConsignmentSchema = createInsertSchema(consignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConsignment = z.infer<typeof insertConsignmentSchema>;
export type Consignment = typeof consignmentsTable.$inferSelect;
