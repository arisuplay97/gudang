// @ts-nocheck
import { Router } from "express";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { db, consignmentsTable, itemsTable, suppliersTable, warehousesTable, usersTable, auditLogsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
const router = Router();
// ─── LIST ───
router.get("/consignments", requireAuth, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, search } = req.query;
    const conditions = [];
    if (status)
        conditions.push(eq(consignmentsTable.status, status));
    if (search)
        conditions.push(ilike(consignmentsTable.referenceNo, `%${search}%`));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ count }] = await db.select({ count: sql `count(*)` }).from(consignmentsTable).where(whereClause);
    const rows = await db
        .select({
        id: consignmentsTable.id,
        referenceNo: consignmentsTable.referenceNo,
        itemId: consignmentsTable.itemId,
        itemCode: itemsTable.code,
        itemName: itemsTable.name,
        quantity: consignmentsTable.quantity,
        unitPrice: consignmentsTable.unitPrice,
        supplierId: consignmentsTable.supplierId,
        supplierName: suppliersTable.name,
        warehouseId: consignmentsTable.warehouseId,
        warehouseName: warehousesTable.name,
        receivedDate: consignmentsTable.receivedDate,
        status: consignmentsTable.status,
        notes: consignmentsTable.notes,
        createdByName: usersTable.fullName,
        createdAt: consignmentsTable.createdAt,
    })
        .from(consignmentsTable)
        .leftJoin(itemsTable, eq(consignmentsTable.itemId, itemsTable.id))
        .leftJoin(suppliersTable, eq(consignmentsTable.supplierId, suppliersTable.id))
        .leftJoin(warehousesTable, eq(consignmentsTable.warehouseId, warehousesTable.id))
        .leftJoin(usersTable, eq(consignmentsTable.createdBy, usersTable.id))
        .where(whereClause)
        .orderBy(desc(consignmentsTable.createdAt))
        .limit(limit)
        .offset(offset);
    const result = rows.map(r => ({
        ...r,
        unitPrice: r.unitPrice ? parseFloat(String(r.unitPrice)) : 0,
        receivedDate: r.receivedDate instanceof Date ? r.receivedDate.toISOString() : new Date(r.receivedDate).toISOString(),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
    }));
    res.json({ data: result, pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) } });
});
// ─── CREATE ───
router.post("/consignments", requireAuth, async (req, res) => {
    const { itemId, quantity, unitPrice, supplierId, warehouseId, receivedDate, expiryDate, notes } = req.body;
    if (!itemId || !quantity || quantity <= 0) {
        res.status(400).json({ error: "Item dan quantity wajib diisi" });
        return;
    }
    if (!receivedDate) {
        res.status(400).json({ error: "Tanggal terima wajib diisi" });
        return;
    }
    const refNo = generateRefNo("TT");
    const [row] = await db.insert(consignmentsTable).values({
        referenceNo: refNo,
        itemId,
        quantity,
        unitPrice: String(unitPrice || 0),
        supplierId: supplierId ?? null,
        warehouseId: warehouseId ?? null,
        receivedDate: new Date(receivedDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes ?? null,
        createdBy: req.session.userId ?? null,
        status: "active",
    }).returning();
    await db.insert(auditLogsTable).values({
        entityType: "consignment", entityId: row.id, action: "create",
        description: `Barang titipan ${refNo} dibuat`, userId: req.session.userId,
    });
    res.status(201).json({ ...row, referenceNo: refNo });
});
// ─── GET DETAIL ───
router.get("/consignments/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const [row] = await db
        .select({
        id: consignmentsTable.id,
        referenceNo: consignmentsTable.referenceNo,
        itemId: consignmentsTable.itemId,
        itemCode: itemsTable.code,
        itemName: itemsTable.name,
        quantity: consignmentsTable.quantity,
        unitPrice: consignmentsTable.unitPrice,
        supplierId: consignmentsTable.supplierId,
        supplierName: suppliersTable.name,
        warehouseId: consignmentsTable.warehouseId,
        warehouseName: warehousesTable.name,
        receivedDate: consignmentsTable.receivedDate,
        expiryDate: consignmentsTable.expiryDate,
        status: consignmentsTable.status,
        notes: consignmentsTable.notes,
        createdByName: usersTable.fullName,
        createdAt: consignmentsTable.createdAt,
    })
        .from(consignmentsTable)
        .leftJoin(itemsTable, eq(consignmentsTable.itemId, itemsTable.id))
        .leftJoin(suppliersTable, eq(consignmentsTable.supplierId, suppliersTable.id))
        .leftJoin(warehousesTable, eq(consignmentsTable.warehouseId, warehousesTable.id))
        .leftJoin(usersTable, eq(consignmentsTable.createdBy, usersTable.id))
        .where(eq(consignmentsTable.id, id));
    if (!row) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    res.json({
        ...row,
        unitPrice: row.unitPrice ? parseFloat(String(row.unitPrice)) : 0,
        receivedDate: row.receivedDate instanceof Date ? row.receivedDate.toISOString() : new Date(row.receivedDate).toISOString(),
        expiryDate: row.expiryDate ? (row.expiryDate instanceof Date ? row.expiryDate.toISOString() : new Date(row.expiryDate).toISOString()) : null,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
    });
});
// ─── UPDATE STATUS ───
router.patch("/consignments/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const { status, notes } = req.body;
    if (!status) {
        res.status(400).json({ error: "Status wajib diisi" });
        return;
    }
    await db.update(consignmentsTable).set({ status, notes: notes ?? undefined }).where(eq(consignmentsTable.id, id));
    await db.insert(auditLogsTable).values({
        entityType: "consignment", entityId: id, action: "update",
        description: `Status barang titipan diubah ke ${status}`, userId: req.session.userId,
    });
    res.json({ message: "Berhasil diperbarui" });
});
// ─── DELETE ───
router.delete("/consignments/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const [row] = await db.select().from(consignmentsTable).where(eq(consignmentsTable.id, id));
    if (!row) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    await db.delete(consignmentsTable).where(eq(consignmentsTable.id, id));
    await db.insert(auditLogsTable).values({
        entityType: "consignment", entityId: id, action: "delete",
        description: `Barang titipan ${row.referenceNo} dihapus`, userId: req.session.userId,
    });
    res.json({ message: "Berhasil dihapus" });
});
export default router;
