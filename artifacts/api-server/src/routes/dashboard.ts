// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, sql, gte, and, lt, desc } from "drizzle-orm";
import {
  db, itemsTable, stockOutTable, auditLogsTable, usersTable,
  materialTrackingTable, stockOutItemsTable, installationEvidenceTable, branchesTable,
  branchStocksTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const SLA_DAYS = 7;

// GET /dashboard/summary — Ringkasan dashboard pusat
router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  try {
    const allItems = await db.select().from(itemsTable);
    const totalItems = allItems.length;

    // Hitung total nilai & total unit aksesoris yang ada di seluruh cabang
    const branchStockData = await db
      .select({
        quantity: branchStocksTable.quantity,
        unitPrice: itemsTable.unitPrice,
      })
      .from(branchStocksTable)
      .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id));

    const inventoryValue = branchStockData.reduce((sum, i) => sum + (i.quantity * parseFloat(i.unitPrice || 0)), 0);
    const totalBranchStocks = branchStockData.reduce((sum, i) => sum + (i.quantity || 0), 0);

    const stockOutAll = await db.select().from(stockOutTable);

    const isFinalized = (status?: string) =>
      !!status && ["finalized", "completed", "dikirim", "diproses", "selesai", "approved"].includes(status.toLowerCase());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStockOut = stockOutAll.filter(r => r.transactionDate >= today && isFinalized(r.status)).length;
    const pendingOut = stockOutAll.filter(r => r.status === "draft" || r.status === "DRAFT").length;

    const trackedItems = allItems.filter(i => (i as any).trackingType === "TRACKED").length;
    const nonTrackedItems = totalItems - trackedItems;

    // Hitung metrik operasional baru:
    const allTrackings = await db.select().from(materialTrackingTable);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Menunggu ACC Cabang (status MENUNGGU_DITERIMA atau pengiriman yang belum diterima penuh)
    const pendingBranchAcceptance = allTrackings.filter(t => t.status === "MENUNGGU_DITERIMA").length;

    // 2. Jumlah Terpasang Bulan Ini
    const installedTrackings = allTrackings.filter(t =>
      ["TERPASANG", "MENUNGGU_VERIFIKASI", "TERVERIFIKASI"].includes(t.status)
    );
    let installedThisMonth = installedTrackings.filter(t =>
      t.installedAt && new Date(t.installedAt) >= startOfMonth
    ).length;
    if (installedThisMonth === 0 && installedTrackings.length > 0) {
      // Jika transisi pergantian bulan, tampilkan total terpasang siklus aktif
      installedThisMonth = installedTrackings.length;
    }

    // 3. Perlu Perhatian (SLA Overdue atau Ditolak / Bermasalah)
    const needsAttentionCount = allTrackings.filter(t => {
      if (t.status === "DITOLAK") return true;
      if (t.slaDeadlineAt && new Date(t.slaDeadlineAt).getTime() < now.getTime() && t.status !== "TERVERIFIKASI") {
        return true;
      }
      return false;
    }).length;

    res.json({
      totalItems,
      totalStockIn: 0,
      totalStockOut: stockOutAll.filter(r => isFinalized(r.status)).length,
      totalBranchStocks,
      lowStockCount: 0,
      pendingTransactions: pendingOut,
      inventoryValue,
      todayStockIn: 0,
      todayStockOut,
      trackedItems,
      nonTrackedItems,
      pendingBranchAcceptance,
      installedThisMonth,
      needsAttentionCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal memuat ringkasan dashboard" });
  }
});

// GET /dashboard/recent-transactions
router.get("/dashboard/recent-transactions", requireAuth, async (_req, res): Promise<void> => {
  try {
    const stockOut = await db
      .select({ id: stockOutTable.id, referenceNo: stockOutTable.referenceNo, status: stockOutTable.status, createdAt: stockOutTable.createdAt })
      .from(stockOutTable)
      .orderBy(desc(stockOutTable.createdAt))
      .limit(10);

    const all = stockOut.map(r => ({
      id: r.id,
      referenceNo: r.referenceNo,
      type: "stock_out",
      status: r.status,
      description: `Pengeluaran / Distribusi - ${r.referenceNo}`,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    }));

    res.json(all);
  } catch (err) {
    res.json([]);
  }
});

// GET /dashboard/low-stock — Menampilkan stok cabang yang menipis (<= 5)
router.get("/dashboard/low-stock", requireAuth, async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: branchStocksTable.id,
        code: itemsTable.code,
        name: itemsTable.name,
        branchName: branchesTable.name,
        currentStock: branchStocksTable.quantity,
      })
      .from(branchStocksTable)
      .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id))
      .innerJoin(branchesTable, eq(branchStocksTable.branchId, branchesTable.id))
      .where(sql`${branchStocksTable.quantity} <= 5`)
      .orderBy(branchStocksTable.quantity)
      .limit(20);

    res.json(rows);
  } catch (err) {
    res.json([]);
  }
});

// GET /dashboard/stock-movement (7 or 30 days)
router.get("/dashboard/stock-movement", requireAuth, async (req, res): Promise<void> => {
  try {
    const daysParam = parseInt(req.query.days as string, 10);
    const days = daysParam === 30 ? 30 : 7;
    const isFinalized = (status?: string) =>
      !!status && ["finalized", "completed", "dikirim", "diproses", "selesai", "approved"].includes(status.toLowerCase());

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const allStockOut = await db
      .select({
        id: stockOutTable.id,
        transactionDate: stockOutTable.transactionDate,
        status: stockOutTable.status,
        quantity: sql<number>`COALESCE((SELECT SUM(quantity) FROM stock_out_items WHERE stock_out_id = ${stockOutTable.id}), 1)`
      })
      .from(stockOutTable)
      .where(gte(stockOutTable.transactionDate, startDate));

    const result: { date: string; label: string; dayName: string; stockOut: number; quantity: number }[] = [];
    let totalStockOut = 0;
    let totalQuantity = 0;
    let peakQuantity = 0;
    let peakDate = "";

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });

      const matchingOuts = allStockOut.filter(r => {
        if (!isFinalized(r.status)) return false;
        const rDate = new Date(r.transactionDate).toISOString().split("T")[0];
        return rDate === dateStr;
      });

      const outCount = matchingOuts.length;
      const outQty = matchingOuts.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

      totalStockOut += outCount;
      totalQuantity += outQty;
      if (outQty > peakQuantity) {
        peakQuantity = outQty;
        peakDate = dayLabel;
      }

      result.push({
        date: dateStr,
        label: dayLabel,
        dayName,
        stockOut: outCount,
        quantity: outQty,
      });
    }

    res.json({
      days,
      chartData: result,
      summary: {
        totalTransactions: totalStockOut,
        totalQuantity,
        avgPerDay: Number((totalQuantity / days).toFixed(1)),
        peakDate: peakDate || "-",
        peakQuantity,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /dashboard/branch-installation-ranking
router.get("/dashboard/branch-installation-ranking", requireAuth, async (_req, res): Promise<void> => {
  try {
    const branches = await db.select().from(branchesTable).orderBy(branchesTable.id);

    // Group tracking data by branch
    const trackings = await db
      .select({
        id: materialTrackingTable.id,
        branchId: materialTrackingTable.branchId,
        status: materialTrackingTable.status,
        slaStartAt: materialTrackingTable.slaStartAt,
        slaDeadlineAt: materialTrackingTable.slaDeadlineAt,
        receivedAt: materialTrackingTable.receivedAt,
        installedAt: materialTrackingTable.installedAt,
      })
      .from(materialTrackingTable);

    const rankings = branches.map((branch) => {
      const bTrackings = trackings.filter((t) => t.branchId === branch.id);
      const totalAssigned = bTrackings.length;

      // Installed items: status in TERPASANG, MENUNGGU_VERIFIKASI, TERVERIFIKASI
      const installedItems = bTrackings.filter((t) =>
        ["TERPASANG", "MENUNGGU_VERIFIKASI", "TERVERIFIKASI"].includes(t.status)
      );
      const totalInstalled = installedItems.length;

      let onTimeCount = 0;
      let lateCount = 0;
      let totalDurationHours = 0;
      let durationCount = 0;

      for (const item of installedItems) {
        if (item.installedAt) {
          if (item.slaDeadlineAt) {
            if (new Date(item.installedAt).getTime() <= new Date(item.slaDeadlineAt).getTime()) {
              onTimeCount++;
            } else {
              lateCount++;
            }
          } else {
            onTimeCount++;
          }

          const baseTime = item.receivedAt || item.slaStartAt;
          if (baseTime) {
            const diffHours = Math.max(0.1, (new Date(item.installedAt).getTime() - new Date(baseTime).getTime()) / (1000 * 60 * 60));
            totalDurationHours += diffHours;
            durationCount++;
          }
        }
      }

      const onTimeRate = totalInstalled > 0 ? Math.round((onTimeCount / totalInstalled) * 100) : 0;
      const avgDurationHours = durationCount > 0 ? Number((totalDurationHours / durationCount).toFixed(1)) : null;

      let avgDurationText = "—";
      if (avgDurationHours !== null) {
        if (avgDurationHours < 1) {
          avgDurationText = `${Math.round(avgDurationHours * 60)} mnt`;
        } else if (avgDurationHours < 24) {
          avgDurationText = `${avgDurationHours} jam`;
        } else {
          const days = (avgDurationHours / 24).toFixed(1);
          avgDurationText = `${days} hari`;
        }
      }

      // Score for ranking
      let score = 0;
      if (totalInstalled > 0) {
        score = onTimeRate * 10 - (avgDurationHours ? Math.min(avgDurationHours, 168) : 50);
      }

      return {
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code,
        totalAssigned,
        totalInstalled,
        onTimeCount,
        lateCount,
        onTimeRate,
        avgDurationHours,
        avgDurationText,
        score,
      };
    });

    // Sort by performance: installed branches first, then higher score
    rankings.sort((a, b) => {
      if ((b.totalInstalled > 0) !== (a.totalInstalled > 0)) {
        return b.totalInstalled > 0 ? 1 : -1;
      }
      return b.score - a.score;
    });

    const rankedWithPosition = rankings.map((r, index) => ({
      ...r,
      rank: index + 1,
    }));

    res.json({
      data: rankedWithPosition,
      summary: {
        totalBranches: branches.length,
        activeBranches: rankedWithPosition.filter(r => r.totalInstalled > 0).length,
        avgOnTimeRate: Math.round(
          rankedWithPosition.filter(r => r.totalInstalled > 0).reduce((acc, r) => acc + r.onTimeRate, 0) /
          Math.max(1, rankedWithPosition.filter(r => r.totalInstalled > 0).length)
        ) || 100,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /dashboard/stock-health
router.get("/dashboard/stock-health", requireAuth, async (_req, res): Promise<void> => {
  res.json({ aman: 0, menipis: 0, kritis: 0, habis: 0, overstock: 0 });
});

// GET /dashboard/aging
router.get("/dashboard/aging", requireAuth, async (_req, res): Promise<void> => {
  res.json({ "0-30": 0, "31-90": 0, "91-180": 0, "181-365": 0, ">365": 0 });
});

// GET /dashboard/exceptions
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

    res.json({
      overdue: Number(overdueResult?.count ?? 0),
      locationMismatch: Number(mismatchResult?.count ?? 0),
      evidenceRejected: Number(rejectedResult?.count ?? 0),
      waitingVerification: Number(pendingVerif?.count ?? 0),
      stockCritical: 0,
      stockEmpty: 0,
    });
  } catch (err) {
    res.json({ overdue: 0, locationMismatch: 0, evidenceRejected: 0, waitingVerification: 0, stockCritical: 0, stockEmpty: 0 });
  }
});

// GET /dashboard/top-outgoing
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

// GET /dashboard/activity
router.get("/dashboard/activity", requireAuth, async (_req, res): Promise<void> => {
  try {
    const logs = await db
      .select({
        id: auditLogsTable.id,
        action: auditLogsTable.action,
        description: auditLogsTable.description,
        createdAt: auditLogsTable.createdAt,
      })
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(10);

    res.json(logs.map(l => ({
      id: l.id,
      action: l.action,
      entity: l.description,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    res.json([]);
  }
});

// GET /dashboard/top-branches
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
    res.json([]);
  }
});

export default router;
