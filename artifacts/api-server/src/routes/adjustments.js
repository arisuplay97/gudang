// @ts-nocheck
import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, adjustmentsTable, adjustmentItemsTable, itemsTable, usersTable, auditLogsTable, } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
const router = Router();
async function fmtAdjustment(row) {
    // Ambil detail item dari adjustmentItemsTable
    const [itemDetail] = await db
        .select({
        itemId: adjustmentItemsTable.itemId,
        quantityBefore: adjustmentItemsTable.quantityBefore,
        quantityAdjusted: adjustmentItemsTable.quantityAdjusted,
        quantityAfter: adjustmentItemsTable.quantityAfter,
        itemName: itemsTable.name,
        itemCode: itemsTable.code,
    })
        .from(adjustmentItemsTable)
        .leftJoin(itemsTable, eq(adjustmentItemsTable.itemId, itemsTable.id))
        .where(eq(adjustmentItemsTable.adjustmentId, row.id));
    const [user] = row.createdBy
        ? await db.select().from(usersTable).where(eq(usersTable.id, row.createdBy))
        : [null];
    return {
        id: row.id,
        referenceNo: row.referenceNo,
        referenceNumber: row.referenceNo,
        warehouseId: row.warehouseId,
        itemId: itemDetail?.itemId ?? null,
        itemName: itemDetail?.itemName ?? "",
        itemCode: itemDetail?.itemCode ?? "",
        adjustmentType: row.adjustmentType,
        quantity: itemDetail?.quantityAdjusted ?? 0,
        quantityBefore: itemDetail?.quantityBefore ?? 0,
        quantityAdjusted: itemDetail?.quantityAdjusted ?? 0,
        quantityAfter: itemDetail?.quantityAfter ?? 0,
        reason: row.reason,
        status: row.status,
        notes: row.notes,
        createdByName: user?.fullName ?? null,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
}
// GET /adjustments — list semua penyesuaian
router.get("/adjustments", requireAuth, async (_req, res) => {
    try {
        const rows = await db
            .select()
            .from(adjustmentsTable)
            .orderBy(desc(adjustmentsTable.createdAt));
        const result = await Promise.all(rows.map(fmtAdjustment));
        res.json(result);
    }
    catch (err) {
        console.error("Error GET /adjustments:", err);
        res.status(500).json({ error: err.message || "Gagal memuat data penyesuaian" });
    }
});
// POST /adjustments — buat penyesuaian baru
router.post("/adjustments", requireAuth, async (req, res) => {
    try {
        const { referenceNumber, itemId, adjustmentType, quantity, quantityAdjusted, reason, notes, warehouseId } = req.body;
        const resolvedItemId = parseInt(String(itemId));
        const resolvedQty = Math.abs(parseInt(String(quantityAdjusted ?? quantity ?? 1)));
        if (!resolvedItemId || isNaN(resolvedItemId)) {
            res.status(400).json({ error: "Barang wajib dipilih" });
            return;
        }
        if (!adjustmentType) {
            res.status(400).json({ error: "Tipe penyesuaian wajib dipilih" });
            return;
        }
        if (!resolvedQty || resolvedQty <= 0) {
            res.status(400).json({ error: "Jumlah penyesuaian harus lebih dari 0" });
            return;
        }
        const [item] = await db.select().from(itemsTable).where(eq(itemsTable.id, resolvedItemId));
        if (!item) {
            res.status(404).json({ error: "Barang tidak ditemukan" });
            return;
        }
        let quantityAfter = item.currentStock;
        if (adjustmentType === "add" || adjustmentType === "increase") {
            quantityAfter = item.currentStock + resolvedQty;
        }
        else if (adjustmentType === "subtract" || adjustmentType === "decrease") {
            quantityAfter = Math.max(0, item.currentStock - resolvedQty);
        }
        else if (adjustmentType === "set") {
            quantityAfter = resolvedQty;
        }
        const refNo = referenceNumber?.trim() || generateRefNo("ADJ");
        // Jalankan dalam transaksi DB
        const created = await db.transaction(async (tx) => {
            const [header] = await tx
                .insert(adjustmentsTable)
                .values({
                referenceNo: refNo,
                warehouseId: warehouseId ? parseInt(String(warehouseId)) : null,
                adjustmentType: adjustmentType,
                status: "approved",
                reason: reason?.trim() || "Koreksi Stok",
                notes: notes?.trim() || null,
                createdBy: req.session.userId ?? null,
                approvedBy: req.session.userId ?? null,
            })
                .returning();
            await tx.insert(adjustmentItemsTable).values({
                adjustmentId: header.id,
                itemId: resolvedItemId,
                quantityBefore: item.currentStock,
                quantityAdjusted: resolvedQty,
                quantityAfter,
                notes: notes?.trim() || null,
            });
            // Update stok barang langsung
            await tx
                .update(itemsTable)
                .set({ currentStock: quantityAfter })
                .where(eq(itemsTable.id, resolvedItemId));
            return header;
        });
        await db.insert(auditLogsTable).values({
            entityType: "adjustment",
            entityId: created.id,
            action: "create",
            description: `Penyesuaian stok ${refNo} (${item.name}: ${item.currentStock} -> ${quantityAfter})`,
            userId: req.session.userId,
            username: req.session.username,
        });
        const formatted = await fmtAdjustment(created);
        res.status(201).json(formatted);
    }
    catch (err) {
        console.error("Error POST /adjustments:", err);
        res.status(500).json({ error: err.message || "Gagal menyimpan penyesuaian stok" });
    }
});
// POST /adjustments/:id/approve
router.post("/adjustments/:id/approve", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const [row] = await db.select().from(adjustmentsTable).where(eq(adjustmentsTable.id, id));
    if (!row) {
        res.status(404).json({ error: "Penyesuaian tidak ditemukan" });
        return;
    }
    if (row.status === "approved") {
        res.status(400).json({ error: "Sudah disetujui sebelumnya" });
        return;
    }
    await db
        .update(adjustmentsTable)
        .set({ status: "approved", approvedBy: req.session.userId ?? null })
        .where(eq(adjustmentsTable.id, row.id));
    await db.insert(auditLogsTable).values({
        entityType: "adjustment",
        entityId: row.id,
        action: "approve",
        description: `Penyesuaian stok ${row.referenceNo} disetujui`,
        userId: req.session.userId,
    });
    const [updated] = await db.select().from(adjustmentsTable).where(eq(adjustmentsTable.id, row.id));
    res.json(await fmtAdjustment(updated));
});
export default router;
