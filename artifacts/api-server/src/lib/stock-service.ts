// @ts-nocheck
import { eq, and, sql } from "drizzle-orm";
import { db, stockBalancesTable, stockMovementsTable, itemsTable } from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface StockRef {
    referenceType: string;
    referenceId: number;
    referenceNo: string;
    userId?: number | null;
    notes?: string | null;
    movementDate?: Date;
}

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
    static async increaseStock(
        tx: Tx,
        itemId: number,
        warehouseId: number,
        qty: number,
        ref: StockRef
    ): Promise<void> {
        if (qty <= 0) throw new Error("Quantity harus lebih besar dari 0");

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
    static async decreaseStock(
        tx: Tx,
        itemId: number,
        warehouseId: number,
        qty: number,
        ref: StockRef
    ): Promise<void> {
        if (qty <= 0) throw new Error("Quantity harus lebih besar dari 0");

        const balance = await StockService.getOrCreateBalance(tx, itemId, warehouseId);
        const balanceBefore = balance.quantity;

        if (balanceBefore < qty) {
            const [item] = await tx.select({ name: itemsTable.name }).from(itemsTable).where(eq(itemsTable.id, itemId));
            throw new Error(
                `Stok tidak mencukupi. Barang: ${item?.name ?? itemId}. Stok tersedia: ${balanceBefore}. Qty diminta: ${qty}.`
            );
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
    static async transferStock(
        tx: Tx,
        itemId: number,
        fromWarehouseId: number,
        toWarehouseId: number,
        qty: number,
        ref: StockRef
    ): Promise<void> {
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
    static async adjustStock(
        tx: Tx,
        itemId: number,
        warehouseId: number,
        newQty: number,
        ref: StockRef
    ): Promise<void> {
        if (newQty < 0) throw new Error("Stok tidak boleh negatif");

        const balance = await StockService.getOrCreateBalance(tx, itemId, warehouseId);
        const balanceBefore = balance.quantity;
        const diff = newQty - balanceBefore;

        if (diff === 0) return; // No change needed

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
    static async reverseStock(
        tx: Tx,
        itemId: number,
        warehouseId: number,
        qty: number,
        originalDirection: "in" | "out",
        ref: StockRef
    ): Promise<void> {
        if (originalDirection === "in") {
            // Original was increase, so reverse is decrease
            await StockService.decreaseStock(tx, itemId, warehouseId, qty, {
                ...ref,
                referenceType: "void",
            });
        } else {
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
    private static async getOrCreateBalance(
        tx: Tx,
        itemId: number,
        warehouseId: number
    ) {
        // Try to find existing with FOR UPDATE lock
        const [existing] = await tx
            .select()
            .from(stockBalancesTable)
            .where(and(
                eq(stockBalancesTable.itemId, itemId),
                eq(stockBalancesTable.warehouseId, warehouseId)
            ))
            .for("update");

        if (existing) return existing;

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
    private static async syncItemCurrentStock(tx: Tx, itemId: number) {
        const result = await tx
            .select({ total: sql<number>`COALESCE(SUM(${stockBalancesTable.quantity}), 0)` })
            .from(stockBalancesTable)
            .where(eq(stockBalancesTable.itemId, itemId));

        const total = Number(result[0]?.total ?? 0);

        await tx.update(itemsTable)
            .set({ currentStock: total })
            .where(eq(itemsTable.id, itemId));
    }
}
