// @ts-nocheck
import { eq, and, sql } from "drizzle-orm";
import { stockBalancesTable, stockMovementsTable, itemsTable } from "@workspace/db";
/**
 * Centralized Stock Service — single source of truth for all stock operations.
 * All methods operate within a transaction (tx) passed from the caller.
 * Each operation:
 *   1. Gets/creates stock_balance with FOR UPDATE lock
 *   2. Updates stock_balance quantity
 *   3. Records stock_movement with before/after
 *   4. Updates items.currentStock (denormalized cache)
 */
export class StockService {
    /**
     * Increase stock (barang masuk, retur dari lapangan)
     */
    static async increaseStock(tx, itemId, warehouseId, qty, ref) {
        if (qty <= 0)
            throw new Error("Quantity harus lebih besar dari 0");
        // Get or create balance with lock
        const balance = await StockService.getOrCreateBalance(tx, itemId, warehouseId);
        const balanceBefore = balance.quantity;
        const balanceAfter = balanceBefore + qty;
        // Update stock_balance
        await tx.update(stockBalancesTable)
            .set({ quantity: balanceAfter })
            .where(eq(stockBalancesTable.id, balance.id));
        // Record movement
        await tx.insert(stockMovementsTable).values({
            movementDate: ref.movementDate ?? new Date(),
            movementType: ref.referenceType,
            itemId,
            warehouseId,
            quantity: qty,
            direction: "in",
            balanceBefore,
            balanceAfter,
            referenceType: ref.referenceType,
            referenceId: ref.referenceId,
            referenceNo: ref.referenceNo,
            userId: ref.userId ?? null,
            notes: ref.notes ?? null,
        });
        // Update denormalized currentStock on items
        await StockService.syncItemCurrentStock(tx, itemId);
    }
    /**
     * Decrease stock (barang keluar, retur ke supplier)
     * Throws error if insufficient stock
     */
    static async decreaseStock(tx, itemId, warehouseId, qty, ref) {
        if (qty <= 0)
            throw new Error("Quantity harus lebih besar dari 0");
        const balance = await StockService.getOrCreateBalance(tx, itemId, warehouseId);
        const balanceBefore = balance.quantity;
        if (balanceBefore < qty) {
            const [item] = await tx.select({ name: itemsTable.name }).from(itemsTable).where(eq(itemsTable.id, itemId));
            throw new Error(`Stok tidak mencukupi. Barang: ${item?.name ?? itemId}. Stok tersedia: ${balanceBefore}. Qty diminta: ${qty}.`);
        }
        const balanceAfter = balanceBefore - qty;
        await tx.update(stockBalancesTable)
            .set({ quantity: balanceAfter })
            .where(eq(stockBalancesTable.id, balance.id));
        await tx.insert(stockMovementsTable).values({
            movementDate: ref.movementDate ?? new Date(),
            movementType: ref.referenceType,
            itemId,
            warehouseId,
            quantity: qty,
            direction: "out",
            balanceBefore,
            balanceAfter,
            referenceType: ref.referenceType,
            referenceId: ref.referenceId,
            referenceNo: ref.referenceNo,
            userId: ref.userId ?? null,
            notes: ref.notes ?? null,
        });
        await StockService.syncItemCurrentStock(tx, itemId);
    }
    /**
     * Transfer stock between warehouses (mutasi)
     */
    static async transferStock(tx, itemId, fromWarehouseId, toWarehouseId, qty, ref) {
        // Decrease from source
        await StockService.decreaseStock(tx, itemId, fromWarehouseId, qty, {
            ...ref,
            referenceType: "transfer_out",
        });
        // Increase at destination
        await StockService.increaseStock(tx, itemId, toWarehouseId, qty, {
            ...ref,
            referenceType: "transfer_in",
        });
    }
    /**
     * Adjust stock to a specific quantity (penyesuaian / opname)
     */
    static async adjustStock(tx, itemId, warehouseId, newQty, ref) {
        if (newQty < 0)
            throw new Error("Stok tidak boleh negatif");
        const balance = await StockService.getOrCreateBalance(tx, itemId, warehouseId);
        const balanceBefore = balance.quantity;
        const diff = newQty - balanceBefore;
        if (diff === 0)
            return; // No change needed
        await tx.update(stockBalancesTable)
            .set({ quantity: newQty })
            .where(eq(stockBalancesTable.id, balance.id));
        await tx.insert(stockMovementsTable).values({
            movementDate: ref.movementDate ?? new Date(),
            movementType: "adjustment",
            itemId,
            warehouseId,
            quantity: Math.abs(diff),
            direction: diff > 0 ? "in" : "out",
            balanceBefore,
            balanceAfter: newQty,
            referenceType: ref.referenceType,
            referenceId: ref.referenceId,
            referenceNo: ref.referenceNo,
            userId: ref.userId ?? null,
            notes: ref.notes ?? null,
        });
        await StockService.syncItemCurrentStock(tx, itemId);
    }
    /**
     * Reverse stock (void/cancel transactions)
     */
    static async reverseStock(tx, itemId, warehouseId, qty, originalDirection, ref) {
        if (originalDirection === "in") {
            // Original was increase, so reverse is decrease
            await StockService.decreaseStock(tx, itemId, warehouseId, qty, {
                ...ref,
                referenceType: "void",
            });
        }
        else {
            // Original was decrease, so reverse is increase
            await StockService.increaseStock(tx, itemId, warehouseId, qty, {
                ...ref,
                referenceType: "void",
            });
        }
    }
    /**
     * Get or create a stock_balance row, with row-level lock
     */
    static async getOrCreateBalance(tx, itemId, warehouseId) {
        // Try to find existing with FOR UPDATE lock
        const [existing] = await tx
            .select()
            .from(stockBalancesTable)
            .where(and(eq(stockBalancesTable.itemId, itemId), eq(stockBalancesTable.warehouseId, warehouseId)))
            .for("update");
        if (existing)
            return existing;
        // Create new balance
        const [created] = await tx.insert(stockBalancesTable).values({
            itemId,
            warehouseId,
            quantity: 0,
        }).returning();
        return created;
    }
    /**
     * Sync items.currentStock = SUM of all warehouse balances for this item
     */
    static async syncItemCurrentStock(tx, itemId) {
        const result = await tx
            .select({ total: sql `COALESCE(SUM(${stockBalancesTable.quantity}), 0)` })
            .from(stockBalancesTable)
            .where(eq(stockBalancesTable.itemId, itemId));
        const total = Number(result[0]?.total ?? 0);
        await tx.update(itemsTable)
            .set({ currentStock: total })
            .where(eq(itemsTable.id, itemId));
    }
}
