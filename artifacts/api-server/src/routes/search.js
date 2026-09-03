// @ts-nocheck
/**
 * Global Search API — Section 5, 6
 * Server-side search across materials, transactions, tracking, branches
 */
import { Router } from "express";
import { db, itemsTable, stockOutTable, stockInTable, materialTrackingTable, branchesTable } from "@workspace/db";
import { or, ilike } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
const router = Router();
router.get("/search", requireAuth, async (req, res) => {
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
        res.json({ results: [] });
        return;
    }
    const pattern = `%${q}%`;
    const role = req.session.role || "GUDANG";
    try {
        // Search materials (items)
        const materials = await db
            .select({
            id: itemsTable.id,
            code: itemsTable.code,
            name: itemsTable.name,
            barcode: itemsTable.barcode,
        })
            .from(itemsTable)
            .where(or(ilike(itemsTable.name, pattern), ilike(itemsTable.code, pattern), ilike(itemsTable.barcode, pattern)))
            .limit(5);
        // Search stock-out transactions (distribusi)
        const transactions = await db
            .select({
            id: stockOutTable.id,
            referenceNo: stockOutTable.referenceNo,
            status: stockOutTable.status,
        })
            .from(stockOutTable)
            .where(ilike(stockOutTable.referenceNo, pattern))
            .limit(5);
        // Search stock-in transactions
        const stockIns = await db
            .select({
            id: stockInTable.id,
            referenceNo: stockInTable.referenceNo,
            status: stockInTable.status,
        })
            .from(stockInTable)
            .where(ilike(stockInTable.referenceNo, pattern))
            .limit(5);
        // Search tracking (only for ADMIN, GUDANG, SPI)
        let tracking = [];
        if (["ADMIN", "GUDANG", "SPI"].includes(role)) {
            tracking = await db
                .select({
                id: materialTrackingTable.id,
                uuid: materialTrackingTable.uuid,
                status: materialTrackingTable.status,
            })
                .from(materialTrackingTable)
                .where(ilike(materialTrackingTable.uuid, pattern))
                .limit(5);
        }
        // Search branches
        const branches = await db
            .select({
            id: branchesTable.id,
            name: branchesTable.name,
            code: branchesTable.code,
        })
            .from(branchesTable)
            .where(or(ilike(branchesTable.name, pattern), ilike(branchesTable.code, pattern)))
            .limit(5);
        const results = [
            ...materials.map(m => ({
                group: "MATERIAL",
                id: m.id,
                title: m.name,
                subtitle: m.code + (m.barcode ? ` · ${m.barcode}` : ""),
                href: "/master/barang",
            })),
            ...transactions.map(t => ({
                group: "TRANSAKSI",
                id: t.id,
                title: `Distribusi ${t.referenceNo}`,
                subtitle: t.status,
                href: "/transaksi/keluar",
            })),
            ...stockIns.map(t => ({
                group: "TRANSAKSI",
                id: t.id,
                title: `Material Masuk ${t.referenceNo}`,
                subtitle: t.status,
                href: "/transaksi/masuk",
            })),
            ...tracking.map(t => ({
                group: "TRACKING",
                id: t.id,
                title: `Tracking ${t.uuid}`,
                subtitle: t.status,
                href: "/cabang/tracking",
            })),
            ...branches.map(b => ({
                group: "CABANG",
                id: b.id,
                title: b.name,
                subtitle: b.code,
                href: "/master/gudang",
            })),
        ];
        res.json({ results });
    }
    catch (err) {
        console.error("Search error:", err);
        res.json({ results: [] });
    }
});
export default router;
