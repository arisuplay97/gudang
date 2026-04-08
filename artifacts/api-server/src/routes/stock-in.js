// @ts-nocheck
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, stockInTable, stockInItemsTable, itemsTable, suppliersTable, usersTable, locationsTable, auditLogsTable } from "@workspace/db";
import { CreateStockInBody, ListStockInQueryParams, GetStockInParams, FinalizeStockInParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
const router = Router();
function fmtStockIn(row, extras) {
    return {
        id: row.id,
        referenceNo: row.referenceNo,
        supplierId: row.supplierId,
        supplierName: extras.supplierName ?? null,
        status: row.status,
        notes: row.notes,
        createdByName: extras.createdByName ?? null,
        totalItems: extras.totalItems ?? 0,
        transactionDate: row.transactionDate instanceof Date ? row.transactionDate.toISOString() : new Date(row.transactionDate).toISOString(),
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
    };
}
router.get("/stock-in", requireAuth, async (req, res) => {
    const qp = ListStockInQueryParams.safeParse(req.query);
    const rows = await db
        .select({
        id: stockInTable.id,
        referenceNo: stockInTable.referenceNo,
        supplierId: stockInTable.supplierId,
        supplierName: suppliersTable.name,
        status: stockInTable.status,
        notes: stockInTable.notes,
        createdBy: stockInTable.createdBy,
        createdByName: usersTable.fullName,
        transactionDate: stockInTable.transactionDate,
        createdAt: stockInTable.createdAt,
    })
        .from(stockInTable)
        .leftJoin(suppliersTable, eq(stockInTable.supplierId, suppliersTable.id))
        .leftJoin(usersTable, eq(stockInTable.createdBy, usersTable.id))
        .orderBy(stockInTable.createdAt);
    let filtered = rows;
    if (qp.success) {
        if (qp.data.status)
            filtered = filtered.filter(r => r.status === qp.data.status);
        if (qp.data.startDate)
            filtered = filtered.filter(r => r.transactionDate >= new Date(qp.data.startDate));
        if (qp.data.endDate)
            filtered = filtered.filter(r => r.transactionDate <= new Date(qp.data.endDate));
    }
    const result = await Promise.all(filtered.map(async (row) => {
        const items = await db.select().from(stockInItemsTable).where(eq(stockInItemsTable.stockInId, row.id));
        return { ...fmtStockIn(row, { supplierName: row.supplierName, createdByName: row.createdByName }), totalItems: items.length };
    }));
    res.json(result);
});
router.post("/stock-in", requireAuth, async (req, res) => {
    const parsed = CreateStockInBody.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
    }
    const refNo = generateRefNo("BM");
    const [header] = await db.insert(stockInTable).values({
        referenceNo: refNo,
        supplierId: parsed.data.supplierId ?? null,
        notes: parsed.data.notes ?? null,
        createdBy: req.session.userId ?? null,
        transactionDate: new Date(parsed.data.transactionDate),
        status: "draft",
    }).returning();
    for (const item of parsed.data.items) {
        await db.insert(stockInItemsTable).values({
            stockInId: header.id,
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            locationId: item.locationId ?? null,
            notes: item.notes ?? null,
        });
    }
    await db.insert(auditLogsTable).values({
        entityType: "stock_in",
        entityId: header.id,
        action: "create",
        description: `Barang masuk ${refNo} dibuat`,
        userId: req.session.userId,
    });
    res.status(201).json(fmtStockIn(header, { totalItems: parsed.data.items.length }));
});
router.get("/stock-in/:id", requireAuth, async (req, res) => {
    const params = GetStockInParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [header] = await db
        .select({
        id: stockInTable.id,
        referenceNo: stockInTable.referenceNo,
        supplierId: stockInTable.supplierId,
        supplierName: suppliersTable.name,
        status: stockInTable.status,
        notes: stockInTable.notes,
        createdByName: usersTable.fullName,
        transactionDate: stockInTable.transactionDate,
        createdAt: stockInTable.createdAt,
    })
        .from(stockInTable)
        .leftJoin(suppliersTable, eq(stockInTable.supplierId, suppliersTable.id))
        .leftJoin(usersTable, eq(stockInTable.createdBy, usersTable.id))
        .where(eq(stockInTable.id, params.data.id));
    if (!header) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    const items = await db
        .select({
        id: stockInItemsTable.id,
        itemId: stockInItemsTable.itemId,
        itemCode: itemsTable.code,
        itemName: itemsTable.name,
        quantity: stockInItemsTable.quantity,
        unitPrice: stockInItemsTable.unitPrice,
        locationId: stockInItemsTable.locationId,
        locationName: locationsTable.name,
        notes: stockInItemsTable.notes,
    })
        .from(stockInItemsTable)
        .leftJoin(itemsTable, eq(stockInItemsTable.itemId, itemsTable.id))
        .leftJoin(locationsTable, eq(stockInItemsTable.locationId, locationsTable.id))
        .where(eq(stockInItemsTable.stockInId, params.data.id));
    res.json({
        ...header,
        transactionDate: header.transactionDate instanceof Date ? header.transactionDate.toISOString() : new Date(header.transactionDate).toISOString(),
        createdAt: header.createdAt instanceof Date ? header.createdAt.toISOString() : new Date(header.createdAt).toISOString(),
        items: items.map(i => ({ ...i, unitName: null, unitPrice: parseFloat(String(i.unitPrice)) })),
    });
});
router.post("/stock-in/:id/finalize", requireAuth, async (req, res) => {
    const params = FinalizeStockInParams.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({ error: params.error.message });
        return;
    }
    const [header] = await db.select().from(stockInTable).where(eq(stockInTable.id, params.data.id));
    if (!header) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    if (header.status === "finalized") {
        res.status(400).json({ error: "Sudah difinalisasi" });
        return;
    }
    const items = await db.select().from(stockInItemsTable).where(eq(stockInItemsTable.stockInId, header.id));
    await db.transaction(async (tx) => {
        for (const item of items) {
            await tx.update(itemsTable)
                .set({ currentStock: itemsTable.currentStock })
                .where(eq(itemsTable.id, item.itemId));
            const [current] = await tx.select({ currentStock: itemsTable.currentStock }).from(itemsTable).where(eq(itemsTable.id, item.itemId));
            await tx.update(itemsTable)
                .set({ currentStock: (current?.currentStock ?? 0) + item.quantity })
                .where(eq(itemsTable.id, item.itemId));
        }
        await tx.update(stockInTable).set({ status: "finalized" }).where(eq(stockInTable.id, header.id));
    });
    await db.insert(auditLogsTable).values({
        entityType: "stock_in",
        entityId: header.id,
        action: "finalize",
        description: `Barang masuk ${header.referenceNo} difinalisasi`,
        userId: req.session.userId,
    });
    const [updated] = await db.select().from(stockInTable).where(eq(stockInTable.id, header.id));
    res.json(fmtStockIn(updated, { totalItems: items.length }));
});
export default router;
