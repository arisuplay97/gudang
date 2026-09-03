// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, sql, gte, and, lt, desc } from "drizzle-orm";
import {
  db, itemsTable, stockInTable, stockOutTable, auditLogsTable, usersTable,
  materialTrackingTable, stockOutItemsTable, installationEvidenceTable, branchesTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const SLA_DAYS = 7;

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const allItems = await db.select().from(itemsTable);
  const totalItems = allItems.length;
  const lowStockCount = allItems.filter(i => i.currentStock <= i.minimumStock).length;
  const inventoryValue = allItems.reduce((sum, i) => sum + i.currentStock * parseFloat(i.unitPrice), 0);

  const stockInAll = await db.select().from(stockInTable);
  const stockOutAll = await db.select().from(stockOutTable);

  const isFinalized = (status?: string) =>
    !!status && ["finalized", "completed", "dikirim", "diproses", "selesai", "approved"].includes(status.toLowerCase());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStockIn = stockInAll.filter(r => r.transactionDate >= today && isFinalized(r.status)).length;
  const todayStockOut = stockOutAll.filter(r => r.transactionDate >= today && isFinalized(r.status)).length;

  const pendingIn = stockInAll.filter(r => r.status === "draft" || r.status === "DRAFT").length;
  const pendingOut = stockOutAll.filter(r => r.status === "draft" || r.status === "DRAFT").length;

  const trackedItems = allItems.filter(i => (i as any).trackingType === "TRACKED").length;
  const nonTrackedItems = totalItems - trackedItems;

  res.json({
    totalItems,
    totalStockIn: stockInAll.filter(r => isFinalized(r.status)).length,
    totalStockOut: stockOutAll.filter(r => isFinalized(r.status)).length,
    lowStockCount,
    pendingTransactions: pendingIn + pendingOut,
    inventoryValue,
    todayStockIn,
    todayStockOut,
    trackedItems,
    nonTrackedItems,
  });
});


router.get("/dashboard/recent-transactions", requireAuth, async (_req, res): Promise<void> => {
  const stockIn = await db
    .select({ id: stockInTable.id, referenceNo: stockInTable.referenceNo, status: stockInTable.status, createdAt: stockInTable.createdAt })
    .from(stockInTable)
    .orderBy(stockInTable.createdAt)
    .limit(10);

  const stockOut = await db
    .select({ id: stockOutTable.id, referenceNo: stockOutTable.referenceNo, status: stockOutTable.status, createdAt: stockOutTable.createdAt })
    .from(stockOutTable)
    .orderBy(stockOutTable.createdAt)
    .limit(10);

  const all = [
    ...stockIn.map(r => ({ id: r.id, referenceNo: r.referenceNo, type: "stock_in", status: r.status, description: `Barang Masuk - ${r.referenceNo}`, createdAt: r.createdAt.toISOString() })),
    ...stockOut.map(r => ({ id: r.id, referenceNo: r.referenceNo, type: "stock_out", status: r.status, description: `Barang Keluar - ${r.referenceNo}`, createdAt: r.createdAt.toISOString() })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  res.json(all);
});

router.get("/dashboard/low-stock", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: itemsTable.id,
      code: itemsTable.code,
      name: itemsTable.name,
      currentStock: itemsTable.currentStock,
      minimumStock: itemsTable.minimumStock,
    })
    .from(itemsTable)
    .where(sql`${itemsTable.currentStock} <= ${itemsTable.minimumStock}`)
    .orderBy(itemsTable.currentStock)
    .limit(20);

  res.json(rows.map(r => ({ ...r, unitName: null, categoryName: null })));
});

router.get("/dashboard/stock-movement", requireAuth, async (req, res): Promise<void> => {
  const daysParam = parseInt(req.query.days as string, 10);
  const days = daysParam === 30 ? 30 : 7;
  const isFinalized = (status?: string) =>
    !!status && ["finalized", "completed", "dikirim", "diproses", "selesai", "approved"].includes(status.toLowerCase());

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  // Fetch all in range in 2 parallel queries instead of 60 sequential queries
  const [allStockIn, allStockOut] = await Promise.all([
    db.select({ transactionDate: stockInTable.transactionDate, status: stockInTable.status })
      .from(stockInTable)
      .where(gte(stockInTable.transactionDate, startDate)),
    db.select({ transactionDate: stockOutTable.transactionDate, status: stockOutTable.status })
      .from(stockOutTable)
      .where(gte(stockOutTable.transactionDate, startDate)),
  ]);

  const result: { date: string; stockIn: number; stockOut: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const inCount = allStockIn.filter(r => {
      if (!isFinalized(r.status)) return false;
      const rDate = new Date(r.transactionDate).toISOString().split("T")[0];
      return rDate === dateStr;
    }).length;

    const outCount = allStockOut.filter(r => {
      if (!isFinalized(r.status)) return false;
      const rDate = new Date(r.transactionDate).toISOString().split("T")[0];
      return rDate === dateStr;
    }).length;

    result.push({
      date: dateStr,
      stockIn: inCount,
      stockOut: outCount,
    });
  }

  res.json(result);
});

/* ── NEW: Stock Health (Section 15) ── */
router.get("/dashboard/stock-health", requireAuth, async (_req, res): Promise<void> => {
  try {
    const allItems = await db.select({
      currentStock: itemsTable.currentStock,
      minimumStock: itemsTable.minimumStock,
      maximumStock: itemsTable.maximumStock,
    }).from(itemsTable);

    let aman = 0, menipis = 0, kritis = 0, habis = 0, overstock = 0;
    for (const item of allItems) {
      const cur = item.currentStock;
      const min = item.minimumStock;
      const max = (item as any).maximumStock ?? 999999;
      if (cur === 0) habis++;
      else if (cur <= min * 0.5) kritis++;
      else if (cur <= min) menipis++;
      else if (cur > max && max > 0) overstock++;
      else aman++;
    }
    res.json({ aman, menipis, kritis, habis, overstock });
  } catch (err) {
    res.json({ aman: 0, menipis: 0, kritis: 0, habis: 0, overstock: 0 });
  }
});

/* ── NEW: Aging Material (Section 16) ── */
router.get("/dashboard/aging", requireAuth, async (_req, res): Promise<void> => {
  try {
    const now = new Date();
    const allItems = await db.select({
      id: itemsTable.id,
      currentStock: itemsTable.currentStock,
      createdAt: itemsTable.createdAt,
    }).from(itemsTable).where(sql`${itemsTable.currentStock} > 0`);

    const buckets = { "0-30": 0, "31-90": 0, "91-180": 0, "181-365": 0, ">365": 0 };
    for (const item of allItems) {
      const days = Math.floor((now.getTime() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 30) buckets["0-30"]++;
      else if (days <= 90) buckets["31-90"]++;
      else if (days <= 180) buckets["91-180"]++;
      else if (days <= 365) buckets["181-365"]++;
      else buckets[">365"]++;
    }
    res.json(buckets);
  } catch (err) {
    res.json({ "0-30": 0, "31-90": 0, "91-180": 0, "181-365": 0, ">365": 0 });
  }
});

/* ── NEW: Exception Center (Section 18) ── */
router.get("/dashboard/exceptions", requireAuth, async (_req, res): Promise<void> => {
  try {
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() - SLA_DAYS);

    const [overdueResult] = await db.select({ count: sql<number>`count(*)` })
      .from(materialTrackingTable)
      .where(and(
        lt(materialTrackingTable.createdAt, slaDeadline),
        sql`${materialTrackingTable.status} NOT IN ('TERVERIFIKASI', 'SELESAI')`
      ));

    const [mismatchResult] = await db.select({ count: sql<number>`count(*)` })
      .from(installationEvidenceTable)
      .where(eq(installationEvidenceTable.locationMismatch, true));

    const [rejectedResult] = await db.select({ count: sql<number>`count(*)` })
      .from(installationEvidenceTable)
      .where(eq(installationEvidenceTable.status, "DITOLAK"));

    const [pendingVerif] = await db.select({ count: sql<number>`count(*)` })
      .from(installationEvidenceTable)
      .where(eq(installationEvidenceTable.status, "PENDING"));

    const lowStockCount = await db.select({ count: sql<number>`count(*)` })
      .from(itemsTable)
      .where(sql`${itemsTable.currentStock} <= ${itemsTable.minimumStock} AND ${itemsTable.currentStock} > 0`);

    const zeroStockCount = await db.select({ count: sql<number>`count(*)` })
      .from(itemsTable)
      .where(sql`${itemsTable.currentStock} = 0 AND ${itemsTable.minimumStock} > 0`);

    res.json({
      overdue: Number(overdueResult?.count ?? 0),
      locationMismatch: Number(mismatchResult?.count ?? 0),
      evidenceRejected: Number(rejectedResult?.count ?? 0),
      waitingVerification: Number(pendingVerif?.count ?? 0),
      stockCritical: Number(lowStockCount[0]?.count ?? 0),
      stockEmpty: Number(zeroStockCount[0]?.count ?? 0),
    });
  } catch (err) {
    res.json({ overdue: 0, locationMismatch: 0, evidenceRejected: 0, waitingVerification: 0, stockCritical: 0, stockEmpty: 0 });
  }
});

/* ── NEW: Top Material Keluar (Section 20) ── */
router.get("/dashboard/top-outgoing", requireAuth, async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        itemId: stockOutItemsTable.itemId,
        itemName: itemsTable.name,
        totalQty: sql<number>`CAST(SUM(${stockOutItemsTable.quantity}) AS INTEGER)`,
      })
      .from(stockOutItemsTable)
      .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
      .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
      .where(sql`${stockOutTable.status} IN ('finalized', 'DIKIRIM')`)
      .groupBy(stockOutItemsTable.itemId, itemsTable.name)
      .orderBy(sql`SUM(${stockOutItemsTable.quantity}) DESC`)
      .limit(5);

    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

/* ── NEW: Activity Feed (Section 19) ── */
router.get("/dashboard/activity", requireAuth, async (_req, res): Promise<void> => {
  try {
    const logs = await db
      .select({
        id: auditLogsTable.id,
        action: auditLogsTable.action,
        entity: auditLogsTable.entity,
        createdAt: auditLogsTable.createdAt,
      })
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(10);

    res.json(logs.map(l => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    res.json([]);
  }
});

/* ── NEW: Cabang Material Terbanyak ── */
router.get("/dashboard/top-branches", requireAuth, async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        branchId: branchesTable.id,
        branchName: branchesTable.name,
        totalQty: sql<number>`COALESCE(CAST(SUM(${stockOutItemsTable.quantity}) AS INTEGER), 0)`,
        itemCount: sql<number>`COALESCE(CAST(COUNT(DISTINCT ${stockOutItemsTable.itemId}) AS INTEGER), 0)`,
      })
      .from(branchesTable)
      .leftJoin(stockOutTable, eq(branchesTable.id, stockOutTable.destinationBranchId))
      .leftJoin(stockOutItemsTable, eq(stockOutTable.id, stockOutItemsTable.stockOutId))
      .groupBy(branchesTable.id, branchesTable.name)
      .orderBy(sql`COALESCE(SUM(${stockOutItemsTable.quantity}), 0) DESC`)
      .limit(5);

    let results = rows.filter(r => r.totalQty > 0);

    if (results.length === 0) {
      const trackingRows = await db
        .select({
          branchId: branchesTable.id,
          branchName: branchesTable.name,
          totalQty: sql<number>`COALESCE(CAST(SUM(${stockOutItemsTable.quantity}) AS INTEGER), 0)`,
          itemCount: sql<number>`COALESCE(CAST(COUNT(DISTINCT ${stockOutItemsTable.itemId}) AS INTEGER), 0)`,
        })
        .from(materialTrackingTable)
        .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
        .innerJoin(branchesTable, eq(materialTrackingTable.branchId, branchesTable.id))
        .groupBy(branchesTable.id, branchesTable.name)
        .orderBy(sql`COALESCE(SUM(${stockOutItemsTable.quantity}), 0) DESC`)
        .limit(5);
      results = trackingRows;
    }

    if (results.length === 0) {
      const allBranches = await db.select({ branchId: branchesTable.id, branchName: branchesTable.name }).from(branchesTable).limit(5);
      results = allBranches.map(b => ({
        branchId: b.branchId,
        branchName: b.branchName,
        totalQty: 0,
        itemCount: 0,
      }));
    }

    res.json(results);
  } catch (err) {
    console.error("top-branches error:", err);
    res.json([]);
  }
});

export default router;

