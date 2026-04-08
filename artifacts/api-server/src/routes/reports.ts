// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, itemsTable, categoriesTable, unitsTable, stockInTable, stockOutTable, mutationsTable, auditLogsTable, usersTable } from "@workspace/db";
import { GetStockReportQueryParams, GetTransactionReportQueryParams, ListAuditLogsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/reports/stock", requireAuth, async (req, res): Promise<void> => {
  const qp = GetStockReportQueryParams.safeParse(req.query);
  const rows = await db
    .select({
      itemId: itemsTable.id,
      itemCode: itemsTable.code,
      itemName: itemsTable.name,
      categoryName: categoriesTable.name,
      unitName: unitsTable.name,
      currentStock: itemsTable.currentStock,
      minimumStock: itemsTable.minimumStock,
      unitPrice: itemsTable.unitPrice,
      categoryId: itemsTable.categoryId,
    })
    .from(itemsTable)
    .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
    .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
    .orderBy(itemsTable.name);

  let filtered = rows;
  if (qp.success) {
    if (qp.data.categoryId) filtered = filtered.filter(r => r.categoryId === qp.data.categoryId);
  }

  res.json(filtered.map(r => ({
    itemId: r.itemId,
    itemCode: r.itemCode,
    itemName: r.itemName,
    categoryName: r.categoryName,
    unitName: r.unitName,
    currentStock: r.currentStock,
    minimumStock: r.minimumStock,
    unitPrice: parseFloat(r.unitPrice),
    totalValue: r.currentStock * parseFloat(r.unitPrice),
    status: r.currentStock <= r.minimumStock ? "low" : "normal",
  })));
});

router.get("/reports/transactions", requireAuth, async (req, res): Promise<void> => {
  const qp = GetTransactionReportQueryParams.safeParse(req.query);

  const stockInRows = await db
    .select({
      id: stockInTable.id,
      referenceNo: stockInTable.referenceNo,
      status: stockInTable.status,
      transactionDate: stockInTable.transactionDate,
      createdByName: usersTable.fullName,
    })
    .from(stockInTable)
    .leftJoin(usersTable, eq(stockInTable.createdBy, usersTable.id));

  const stockOutRows = await db
    .select({
      id: stockOutTable.id,
      referenceNo: stockOutTable.referenceNo,
      status: stockOutTable.status,
      transactionDate: stockOutTable.transactionDate,
      createdByName: usersTable.fullName,
    })
    .from(stockOutTable)
    .leftJoin(usersTable, eq(stockOutTable.createdBy, usersTable.id));

  const allRows = [
    ...stockInRows.map(r => ({ ...r, type: "stock_in", totalItems: 1 })),
    ...stockOutRows.map(r => ({ ...r, type: "stock_out", totalItems: 1 })),
  ].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

  let filtered = allRows;
  if (qp.success) {
    if (qp.data.type) filtered = filtered.filter(r => r.type === qp.data.type);
    if (qp.data.startDate) filtered = filtered.filter(r => r.transactionDate >= new Date(qp.data.startDate!));
    if (qp.data.endDate) filtered = filtered.filter(r => r.transactionDate <= new Date(qp.data.endDate!));
  }

  res.json(filtered.map(r => ({
    id: r.id,
    referenceNo: r.referenceNo,
    type: r.type,
    status: r.status,
    totalItems: r.totalItems,
    transactionDate: r.transactionDate.toISOString(),
    createdByName: r.createdByName,
  })));
});

router.get("/reports/inventory-value", requireAuth, async (_req, res): Promise<void> => {
  const items = await db
    .select({
      categoryName: categoriesTable.name,
      currentStock: itemsTable.currentStock,
      unitPrice: itemsTable.unitPrice,
    })
    .from(itemsTable)
    .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id));

  const totalItems = items.length;
  const totalValue = items.reduce((sum, i) => sum + i.currentStock * parseFloat(i.unitPrice), 0);

  const byCategory: Record<string, { itemCount: number; totalValue: number }> = {};
  for (const item of items) {
    const cat = item.categoryName ?? "Tanpa Kategori";
    if (!byCategory[cat]) byCategory[cat] = { itemCount: 0, totalValue: 0 };
    byCategory[cat].itemCount++;
    byCategory[cat].totalValue += item.currentStock * parseFloat(item.unitPrice);
  }

  res.json({
    totalItems,
    totalValue,
    byCategory: Object.entries(byCategory).map(([categoryName, data]) => ({ categoryName, ...data })),
  });
});

router.get("/audit-logs", requireAuth, async (req, res): Promise<void> => {
  const qp = ListAuditLogsQueryParams.safeParse(req.query);
  const rows = await db
    .select({
      id: auditLogsTable.id,
      entityType: auditLogsTable.entityType,
      entityId: auditLogsTable.entityId,
      action: auditLogsTable.action,
      description: auditLogsTable.description,
      userId: auditLogsTable.userId,
      userName: usersTable.fullName,
      createdAt: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .orderBy(auditLogsTable.createdAt);

  let filtered = rows;
  if (qp.success) {
    if (qp.data.entityType) filtered = filtered.filter(r => r.entityType === qp.data.entityType);
    if (qp.data.userId) filtered = filtered.filter(r => r.userId === qp.data.userId);
  }

  const limit = qp.success && qp.data.limit ? qp.data.limit : 200;
  res.json(filtered.slice(-limit).reverse().map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
