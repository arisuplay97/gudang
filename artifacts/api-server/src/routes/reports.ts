// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  itemsTable,
  categoriesTable,
  unitsTable,
  stockInTable,
  stockOutTable,
  stockOutItemsTable,
  branchesTable,
  mutationsTable,
  auditLogsTable,
  usersTable,
  materialTrackingTable,
  installationAllocationsTable,
  installationEvidenceTable,
  materialReceiptsTable,
} from "@workspace/db";
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

// ─── LAPORAN PEMASANGAN AKSESORIS PIPA (BERDASARKAN MATERIAL TRACKING) ───
router.get("/reports/pemasangan-aksesoris", requireAuth, async (req, res): Promise<void> => {
  const { branchId, month, year, search } = req.query;

  // 1. Ambil data Material Tracking berserta item, stock out, cabang, dan user
  const trackingRows = await db
    .select({
      trackingId: materialTrackingTable.id,
      trackingUuid: materialTrackingTable.uuid,
      trackingStatus: materialTrackingTable.status,
      receivedAt: materialTrackingTable.receivedAt,
      installedAt: materialTrackingTable.installedAt,
      slaStartAt: materialTrackingTable.slaStartAt,
      branchId: materialTrackingTable.branchId,
      branchName: branchesTable.name,
      stockOutId: stockOutTable.id,
      referenceNo: stockOutTable.referenceNo,
      transactionDate: stockOutTable.transactionDate,
      releasedAt: stockOutTable.releasedAt,
      stockOutNotes: stockOutTable.notes,
      requestedBy: stockOutTable.requestedBy,
      stockOutCreatedByName: usersTable.fullName,
      itemId: itemsTable.id,
      itemCode: itemsTable.code,
      itemName: itemsTable.name,
      unitName: unitsTable.name,
      itemQuantity: stockOutItemsTable.quantity,
    })
    .from(materialTrackingTable)
    .innerJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
    .innerJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
    .innerJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
    .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
    .leftJoin(branchesTable, eq(materialTrackingTable.branchId, branchesTable.id))
    .leftJoin(usersTable, eq(stockOutTable.createdBy, usersTable.id))
    .orderBy(desc(stockOutTable.transactionDate), desc(materialTrackingTable.id));

  // 2. Ambil bukti foto pemasangan (installation_evidence) & alokasi titik
  const enrichedRows = await Promise.all(
    trackingRows.map(async (tr) => {
      // Ambil foto bukti fisik pemasangan lapangan
      const [evidence] = await db
        .select({
          id: installationEvidenceTable.id,
          latitude: installationEvidenceTable.latitude,
          longitude: installationEvidenceTable.longitude,
          clientCaptureTime: installationEvidenceTable.clientCaptureTime,
          createdAt: installationEvidenceTable.createdAt,
          capturedByName: usersTable.fullName,
        })
        .from(installationEvidenceTable)
        .leftJoin(usersTable, eq(installationEvidenceTable.capturedBy, usersTable.id))
        .where(eq(installationEvidenceTable.trackingId, tr.trackingId))
        .orderBy(desc(installationEvidenceTable.createdAt))
        .limit(1);

      // Ambil alokasi kuantitas & koordinat
      const [alloc] = await db
        .select({
          id: installationAllocationsTable.id,
          quantity: installationAllocationsTable.quantity,
          plannedLatitude: installationAllocationsTable.plannedLatitude,
          plannedLongitude: installationAllocationsTable.plannedLongitude,
        })
        .from(installationAllocationsTable)
        .where(eq(installationAllocationsTable.trackingId, tr.trackingId))
        .orderBy(desc(installationAllocationsTable.createdAt))
        .limit(1);

      // Ambil riwayat scan penerimaan QR cabang jika ada
      const [receipt] = await db
        .select({
          receivedAt: materialReceiptsTable.receivedAt,
          receiverName: usersTable.fullName,
        })
        .from(materialReceiptsTable)
        .leftJoin(usersTable, eq(materialReceiptsTable.receivedBy, usersTable.id))
        .where(eq(materialReceiptsTable.transactionId, tr.stockOutId))
        .limit(1);

      // Tanggal Ambil: ketika barang keluar dari gudang / barang diterima cabang via scan QR
      const rawAmbil = tr.receivedAt || receipt?.receivedAt || tr.releasedAt || tr.transactionDate;
      const dAmbil = new Date(rawAmbil);
      const tanggalAmbil = `${String(dAmbil.getDate()).padStart(2, '0')}/${String(dAmbil.getMonth() + 1).padStart(2, '0')}/${dAmbil.getFullYear()}`;

      // Tanggal Terpasang: langsung tanggal pemasangan berdasarkan foto bukti di lapangan
      const rawPasang = evidence?.clientCaptureTime || tr.installedAt || evidence?.createdAt;
      let tanggalTerpasang = "-";
      if (rawPasang) {
        const dPasang = new Date(rawPasang);
        tanggalTerpasang = `${String(dPasang.getDate()).padStart(2, '0')}/${String(dPasang.getMonth() + 1).padStart(2, '0')}/${dPasang.getFullYear()}`;
      }

      // Titik Koordinat: koordinat GPS dari foto pemasangan
      let titikKoordinat = "-";
      if (evidence?.latitude && evidence?.longitude) {
        titikKoordinat = `${parseFloat(evidence.latitude).toFixed(4)}, ${parseFloat(evidence.longitude).toFixed(4)}`;
      } else if (alloc?.plannedLatitude && alloc?.plannedLongitude) {
        titikKoordinat = `${parseFloat(alloc.plannedLatitude).toFixed(4)}, ${parseFloat(alloc.plannedLongitude).toFixed(4)}`;
      }

      // Petugas: petugas yang mengambil foto pemasangan langsung atau petugas penerima QR
      const petugasList = [];
      if (evidence?.capturedByName) petugasList.push(evidence.capturedByName);
      if (receipt?.receiverName && !petugasList.includes(receipt.receiverName)) petugasList.push(receipt.receiverName);
      if (tr.requestedBy && !petugasList.includes(tr.requestedBy)) petugasList.push(tr.requestedBy);
      if (petugasList.length === 0) petugasList.push(tr.stockOutCreatedByName || "Petugas Cabang");

      // Lokasi Terpasang
      let lokasi = tr.branchName || "Lombok Tengah";
      if (tr.stockOutNotes?.includes(" - ")) {
        lokasi = tr.stockOutNotes.split(" - ")[1].trim();
      } else if (tr.stockOutNotes?.includes("ke Cabang ")) {
        lokasi = tr.stockOutNotes.split("ke Cabang ")[1].trim();
      }

      // Keterangan
      let keterangan = tr.stockOutNotes || "Pemasangan Aksesoris & Pipa Distribusi";
      if (keterangan.includes(" - ")) {
        keterangan = keterangan.split(" - ")[0].trim();
      }

      return {
        trackingId: tr.trackingId,
        stockOutId: tr.stockOutId,
        referenceNo: tr.referenceNo,
        tanggalAmbil,
        rawDate: rawAmbil,
        tanggalTerpasang,
        rawTanggalTerpasang: rawPasang,
        titikKoordinat,
        petugas: petugasList,
        lokasiTerpasang: lokasi,
        branchId: tr.branchId,
        branchName: tr.branchName,
        keterangan,
        item: {
          namaAksesoris: tr.itemName,
          jumlah: alloc?.quantity || tr.itemQuantity,
          satuan: tr.unitName || "Buah",
        },
      };
    })
  );

  // Group items by stockOutId (work order / surat jalan)
  const groupedMap = new Map();
  for (const row of enrichedRows) {
    if (!groupedMap.has(row.stockOutId)) {
      groupedMap.set(row.stockOutId, {
        id: row.stockOutId,
        referenceNo: row.referenceNo,
        tanggalAmbil: row.tanggalAmbil,
        rawDate: row.rawDate,
        tanggalTerpasang: row.tanggalTerpasang,
        lokasiTerpasang: row.lokasiTerpasang,
        titikKoordinat: row.titikKoordinat,
        petugas: row.petugas,
        branchId: row.branchId,
        branchName: row.branchName,
        keterangan: row.keterangan,
        items: [],
      });
    }
    const grp = groupedMap.get(row.stockOutId);
    grp.items.push(row.item);
    if (row.tanggalTerpasang !== "-" && grp.tanggalTerpasang === "-") {
      grp.tanggalTerpasang = row.tanggalTerpasang;
      grp.titikKoordinat = row.titikKoordinat;
    }
  }

  const dbGroups = Array.from(groupedMap.values());
  
  // Hanya gunakan data dari sistem (database)
  const combined = [...dbGroups];

  // Filter by search, branch, month, year
  const filtered = combined.filter(g => {
    if (search && String(search).trim()) {
      const s = String(search).toLowerCase();
      const match = g.lokasiTerpasang.toLowerCase().includes(s) ||
                    g.keterangan.toLowerCase().includes(s) ||
                    g.items.some(it => it.namaAksesoris.toLowerCase().includes(s)) ||
                    g.petugas.some(p => p.toLowerCase().includes(s));
      if (!match) return false;
    }
    if (month && month !== "all") {
      const m = new Date(g.rawDate).getMonth() + 1;
      if (m !== parseInt(month)) return false;
    }
    if (year && year !== "all") {
      const y = new Date(g.rawDate).getFullYear();
      if (y !== parseInt(year)) return false;
    }
    if (branchId && branchId !== "all") {
      if (g.branchId && String(g.branchId) !== String(branchId) && g.branchName !== branchId) {
        return false;
      }
    }
    return true;
  });

  // Re-index numbers
  const reindexed = filtered.map((item, idx) => ({ ...item, no: idx + 1 }));

  res.json({ data: reindexed });
});

export default router;
