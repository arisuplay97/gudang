// @ts-nocheck
import { Router } from "express";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { db, toolLoansTable, toolLoanItemsTable, itemsTable, departmentsTable, warehousesTable, usersTable, auditLogsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
import { StockService } from "../lib/stock-service";
const router = Router();
// ─── LIST ───
router.get("/tool-loans", requireAuth, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, search } = req.query;
    const conditions = [];
    if (status)
        conditions.push(eq(toolLoansTable.status, status));
    if (search)
        conditions.push(ilike(toolLoansTable.referenceNo, `%${search}%`));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ count }] = await db.select({ count: sql `count(*)` }).from(toolLoansTable).where(whereClause);
    const rows = await db
        .select({
        id: toolLoansTable.id,
        referenceNo: toolLoansTable.referenceNo,
        borrowerName: toolLoansTable.borrowerName,
        departmentId: toolLoansTable.departmentId,
        departmentName: departmentsTable.name,
        warehouseId: toolLoansTable.warehouseId,
        warehouseName: warehousesTable.name,
        status: toolLoansTable.status,
        loanDate: toolLoansTable.loanDate,
        expectedReturnDate: toolLoansTable.expectedReturnDate,
        actualReturnDate: toolLoansTable.actualReturnDate,
        notes: toolLoansTable.notes,
        createdByName: usersTable.fullName,
        createdAt: toolLoansTable.createdAt,
    })
        .from(toolLoansTable)
        .leftJoin(departmentsTable, eq(toolLoansTable.departmentId, departmentsTable.id))
        .leftJoin(warehousesTable, eq(toolLoansTable.warehouseId, warehousesTable.id))
        .leftJoin(usersTable, eq(toolLoansTable.createdBy, usersTable.id))
        .where(whereClause)
        .orderBy(desc(toolLoansTable.createdAt))
        .limit(limit)
        .offset(offset);
    // Auto-detect overdue
    const now = new Date();
    const result = rows.map(row => {
        let computedStatus = row.status;
        if (row.status === "borrowed" && row.expectedReturnDate && new Date(row.expectedReturnDate) < now) {
            computedStatus = "overdue";
        }
        return {
            ...row,
            status: computedStatus,
            loanDate: row.loanDate instanceof Date ? row.loanDate.toISOString() : new Date(row.loanDate).toISOString(),
            expectedReturnDate: row.expectedReturnDate instanceof Date ? row.expectedReturnDate.toISOString() : new Date(row.expectedReturnDate).toISOString(),
            actualReturnDate: row.actualReturnDate ? (row.actualReturnDate instanceof Date ? row.actualReturnDate.toISOString() : new Date(row.actualReturnDate).toISOString()) : null,
            createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
        };
    });
    res.json({ data: result, pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) } });
});
// ─── CREATE ───
router.post("/tool-loans", requireAuth, async (req, res) => {
    const { borrowerName, departmentId, warehouseId, loanDate, expectedReturnDate, notes, items } = req.body;
    if (!borrowerName) {
        res.status(400).json({ error: "Nama peminjam wajib diisi" });
        return;
    }
    if (!loanDate || !expectedReturnDate) {
        res.status(400).json({ error: "Tanggal pinjam dan rencana kembali wajib diisi" });
        return;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "Minimal 1 item harus diisi" });
        return;
    }
    if (!warehouseId) {
        res.status(400).json({ error: "Gudang wajib dipilih" });
        return;
    }
    const refNo = generateRefNo("PJ");
    try {
        const result = await db.transaction(async (tx) => {
            const [header] = await tx.insert(toolLoansTable).values({
                referenceNo: refNo,
                borrowerName,
                departmentId: departmentId ?? null,
                warehouseId,
                loanDate: new Date(loanDate),
                expectedReturnDate: new Date(expectedReturnDate),
                notes: notes ?? null,
                createdBy: req.session.userId ?? null,
                status: "borrowed",
            }).returning();
            for (const item of items) {
                if (!item.itemId || !item.quantity || item.quantity <= 0)
                    continue;
                await tx.insert(toolLoanItemsTable).values({
                    toolLoanId: header.id,
                    itemId: item.itemId,
                    quantity: item.quantity,
                    condition: item.condition ?? "good",
                    notes: item.notes ?? null,
                });
                // Decrease stock when borrowed
                await StockService.decreaseStock(tx, item.itemId, warehouseId, item.quantity, {
                    referenceType: "tool_loan",
                    referenceId: header.id,
                    referenceNo: refNo,
                    userId: req.session.userId,
                    movementDate: new Date(loanDate),
                });
            }
            return header;
        });
        await db.insert(auditLogsTable).values({
            entityType: "tool_loan", entityId: result.id, action: "create",
            description: `Peminjaman ${refNo} oleh ${borrowerName}`, userId: req.session.userId,
        });
        res.status(201).json({ ...result, referenceNo: refNo });
    }
    catch (err) {
        if (err.message?.includes("Stok tidak mencukupi")) {
            res.status(400).json({ error: err.message });
            return;
        }
        throw err;
    }
});
// ─── GET DETAIL ───
router.get("/tool-loans/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const [header] = await db
        .select({
        id: toolLoansTable.id,
        referenceNo: toolLoansTable.referenceNo,
        borrowerName: toolLoansTable.borrowerName,
        departmentId: toolLoansTable.departmentId,
        departmentName: departmentsTable.name,
        warehouseId: toolLoansTable.warehouseId,
        warehouseName: warehousesTable.name,
        status: toolLoansTable.status,
        loanDate: toolLoansTable.loanDate,
        expectedReturnDate: toolLoansTable.expectedReturnDate,
        actualReturnDate: toolLoansTable.actualReturnDate,
        notes: toolLoansTable.notes,
        createdByName: usersTable.fullName,
        createdAt: toolLoansTable.createdAt,
    })
        .from(toolLoansTable)
        .leftJoin(departmentsTable, eq(toolLoansTable.departmentId, departmentsTable.id))
        .leftJoin(warehousesTable, eq(toolLoansTable.warehouseId, warehousesTable.id))
        .leftJoin(usersTable, eq(toolLoansTable.createdBy, usersTable.id))
        .where(eq(toolLoansTable.id, id));
    if (!header) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    const items = await db
        .select({
        id: toolLoanItemsTable.id,
        itemId: toolLoanItemsTable.itemId,
        itemCode: itemsTable.code,
        itemName: itemsTable.name,
        quantity: toolLoanItemsTable.quantity,
        returnedQuantity: toolLoanItemsTable.returnedQuantity,
        condition: toolLoanItemsTable.condition,
        notes: toolLoanItemsTable.notes,
    })
        .from(toolLoanItemsTable)
        .leftJoin(itemsTable, eq(toolLoanItemsTable.itemId, itemsTable.id))
        .where(eq(toolLoanItemsTable.toolLoanId, id));
    res.json({
        ...header,
        loanDate: header.loanDate instanceof Date ? header.loanDate.toISOString() : new Date(header.loanDate).toISOString(),
        expectedReturnDate: header.expectedReturnDate instanceof Date ? header.expectedReturnDate.toISOString() : new Date(header.expectedReturnDate).toISOString(),
        actualReturnDate: header.actualReturnDate ? (header.actualReturnDate instanceof Date ? header.actualReturnDate.toISOString() : new Date(header.actualReturnDate).toISOString()) : null,
        createdAt: header.createdAt instanceof Date ? header.createdAt.toISOString() : new Date(header.createdAt).toISOString(),
        items,
    });
});
// ─── RETURN ITEMS ───
router.post("/tool-loans/:id/return", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "ID tidak valid" });
        return;
    }
    const { returnItems } = req.body; // Array of { toolLoanItemId, returnQuantity, condition }
    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
        res.status(400).json({ error: "Data pengembalian wajib diisi" });
        return;
    }
    const [header] = await db.select().from(toolLoansTable).where(eq(toolLoansTable.id, id));
    if (!header) {
        res.status(404).json({ error: "Tidak ditemukan" });
        return;
    }
    if (header.status === "returned") {
        res.status(400).json({ error: "Sudah dikembalikan semua" });
        return;
    }
    const warehouseId = header.warehouseId;
    if (!warehouseId) {
        res.status(400).json({ error: "Gudang tidak valid" });
        return;
    }
    await db.transaction(async (tx) => {
        for (const ri of returnItems) {
            const [loanItem] = await tx.select().from(toolLoanItemsTable).where(eq(toolLoanItemsTable.id, ri.toolLoanItemId));
            if (!loanItem)
                continue;
            const remaining = loanItem.quantity - loanItem.returnedQuantity;
            const returnQty = Math.min(ri.returnQuantity, remaining);
            if (returnQty <= 0)
                continue;
            await tx.update(toolLoanItemsTable)
                .set({
                returnedQuantity: loanItem.returnedQuantity + returnQty,
                condition: ri.condition ?? loanItem.condition,
            })
                .where(eq(toolLoanItemsTable.id, loanItem.id));
            // Return stock (only if condition is good)
            if ((ri.condition ?? "good") === "good") {
                await StockService.increaseStock(tx, loanItem.itemId, warehouseId, returnQty, {
                    referenceType: "tool_loan_return",
                    referenceId: header.id,
                    referenceNo: header.referenceNo,
                    userId: req.session.userId,
                });
            }
        }
        // Check if all items are fully returned
        const allItems = await tx.select().from(toolLoanItemsTable).where(eq(toolLoanItemsTable.toolLoanId, id));
        const allReturned = allItems.every(i => i.returnedQuantity >= i.quantity);
        const someReturned = allItems.some(i => i.returnedQuantity > 0);
        await tx.update(toolLoansTable).set({
            status: allReturned ? "returned" : someReturned ? "partial_returned" : "borrowed",
            actualReturnDate: allReturned ? new Date() : null,
        }).where(eq(toolLoansTable.id, id));
    });
    await db.insert(auditLogsTable).values({
        entityType: "tool_loan", entityId: header.id, action: "return",
        description: `Pengembalian peminjaman ${header.referenceNo}`, userId: req.session.userId,
    });
    res.json({ message: "Berhasil dikembalikan" });
});
export default router;
