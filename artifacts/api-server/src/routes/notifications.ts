// @ts-nocheck
/**
 * Notifications API — Section 7
 * Computes alerts from existing data: overdue tracking, low stock, pending verifications, SLA warnings
 */
import { Router, type IRouter } from "express";
import { eq, sql, and, lt, gte } from "drizzle-orm";
import {
    db,
    itemsTable,
    materialTrackingTable,
    installationEvidenceTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const SLA_DAYS = 7;

router.get("/notifications", requireAuth, async (_req, res): Promise<void> => {
    const notifications: any[] = [];

    try {
        // 1. Overdue tracking (SLA)
        const slaDeadline = new Date();
        slaDeadline.setDate(slaDeadline.getDate() - SLA_DAYS);

        const overdueTracking = await db
            .select({ count: sql<number>`count(*)` })
            .from(materialTrackingTable)
            .where(
                and(
                    lt(materialTrackingTable.createdAt, slaDeadline),
                    sql`${materialTrackingTable.status} NOT IN ('TERVERIFIKASI', 'SELESAI')`
                )
            );
        const overdueCount = Number(overdueTracking[0]?.count ?? 0);
        if (overdueCount > 0) {
            notifications.push({
                id: "sla-overdue",
                category: "SLA",
                title: `${overdueCount} material overdue`,
                description: `Melebihi SLA ${SLA_DAYS} hari`,
                severity: "critical",
                href: "/cabang/tracking",
            });
        }

        // 2. SLA Warning (approaching deadline, 1-2 days left)
        const warningStart = new Date();
        warningStart.setDate(warningStart.getDate() - (SLA_DAYS - 2));
        const warningTracking = await db
            .select({ count: sql<number>`count(*)` })
            .from(materialTrackingTable)
            .where(
                and(
                    lt(materialTrackingTable.createdAt, warningStart),
                    gte(materialTrackingTable.createdAt, slaDeadline),
                    sql`${materialTrackingTable.status} NOT IN ('TERVERIFIKASI', 'SELESAI')`
                )
            );
        const warningCount = Number(warningTracking[0]?.count ?? 0);
        if (warningCount > 0) {
            notifications.push({
                id: "sla-warning",
                category: "SLA",
                title: `${warningCount} SLA warning`,
                description: "Mendekati deadline SLA",
                severity: "warning",
                href: "/cabang/tracking",
            });
        }

        // 3. Low stock / critical stock
        const lowStockItems = await db
            .select({ count: sql<number>`count(*)` })
            .from(itemsTable)
            .where(sql`${itemsTable.currentStock} <= ${itemsTable.minimumStock}`);
        const lowStockCount = Number(lowStockItems[0]?.count ?? 0);
        if (lowStockCount > 0) {
            const zeroStock = await db
                .select({ count: sql<number>`count(*)` })
                .from(itemsTable)
                .where(sql`${itemsTable.currentStock} = 0 AND ${itemsTable.minimumStock} > 0`);
            const zeroCount = Number(zeroStock[0]?.count ?? 0);

            notifications.push({
                id: "stock-low",
                category: "STOCK",
                title: `${lowStockCount} stok menipis`,
                description: zeroCount > 0 ? `${zeroCount} item habis` : "Di bawah batas minimum",
                severity: zeroCount > 0 ? "critical" : "warning",
                href: "/laporan/stok",
            });
        }

        // 4. Pending verifications
        const pendingVerif = await db
            .select({ count: sql<number>`count(*)` })
            .from(installationEvidenceTable)
            .where(eq(installationEvidenceTable.status, "PENDING"));
        const pendingCount = Number(pendingVerif[0]?.count ?? 0);
        if (pendingCount > 0) {
            notifications.push({
                id: "verif-pending",
                category: "VERIFIKASI",
                title: `${pendingCount} menunggu verifikasi`,
                description: "Evidence pemasangan menunggu pemeriksaan",
                severity: "info",
                href: "/spi/verifikasi",
            });
        }

        res.json(notifications);
    } catch (err) {
        console.error("Notifications error:", err);
        res.json([]);
    }
});

export default router;
