// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
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
  branchStocksTable,
} from "@workspace/db";
import { GetStockReportQueryParams, GetTransactionReportQueryParams, ListAuditLogsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/reports/stock", requireAuth, async (req, res): Promise<void> => {
  const qp = GetStockReportQueryParams.safeParse(req.query);

  // Ambil data barang beserta agregasi total stok di seluruh cabang
  const rows = await db
    .select({
      itemId: itemsTable.id,
      itemCode: itemsTable.code,
      itemName: itemsTable.name,
      categoryName: categoriesTable.name,
      unitName: unitsTable.name,
      unitPrice: itemsTable.unitPrice,
      categoryId: itemsTable.categoryId,
    })
    .from(itemsTable)
    .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id))
    .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
    .orderBy(itemsTable.name);

  const branchStocks = await db
    .select({
      itemId: branchStocksTable.itemId,
      totalStock: sql<number>`COALESCE(SUM(${branchStocksTable.quantity}), 0)`,
    })
    .from(branchStocksTable)
    .groupBy(branchStocksTable.itemId);

  const stockMap = new Map<number, number>();
  for (const bs of branchStocks) {
    stockMap.set(bs.itemId, Number(bs.totalStock) || 0);
  }

  let filtered = rows;
  if (qp.success && qp.data.categoryId) {
    filtered = filtered.filter(r => r.categoryId === qp.data.categoryId);
  }

  res.json(filtered.map(r => {
    const curStock = stockMap.get(r.itemId) || 0;
    const price = parseFloat(r.unitPrice || 0);
    return {
      itemId: r.itemId,
      itemCode: r.itemCode,
      itemName: r.itemName,
      categoryName: r.categoryName,
      unitName: r.unitName,
      currentStock: curStock,
      unitPrice: price,
      totalValue: curStock * price,
      status: curStock <= 0 ? "habis" : curStock <= 5 ? "menipis" : "aman",
    };
  }));
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
  const branchStocks = await db
    .select({
      itemId: branchStocksTable.itemId,
      quantity: branchStocksTable.quantity,
      unitPrice: itemsTable.unitPrice,
      categoryName: categoriesTable.name,
    })
    .from(branchStocksTable)
    .innerJoin(itemsTable, eq(branchStocksTable.itemId, itemsTable.id))
    .leftJoin(categoriesTable, eq(itemsTable.categoryId, categoriesTable.id));

  const totalItems = branchStocks.length;
  const totalValue = branchStocks.reduce((sum, i) => sum + (i.quantity * parseFloat(i.unitPrice || 0)), 0);

  const byCategory: Record<string, { itemCount: number; totalValue: number }> = {};
  for (const item of branchStocks) {
    const cat = item.categoryName ?? "Tanpa Kategori";
    if (!byCategory[cat]) byCategory[cat] = { itemCount: 0, totalValue: 0 };
    byCategory[cat].itemCount += item.quantity;
    byCategory[cat].totalValue += item.quantity * parseFloat(item.unitPrice || 0);
  }

  res.json({
    totalItems,
    totalValue,
    byCategory: Object.entries(byCategory).map(([categoryName, data]) => ({ categoryName, ...data })),
  });
});

// ── GET /reports/technicians (Laporan Produktivitas & Audit per Teknisi) ──
router.get("/reports/technicians", requireAuth, async (req, res): Promise<void> => {
  try {
    const { branchId, startDate, endDate, search } = req.query;

    const conditions: any[] = [];
    if (branchId && branchId !== "all") {
      conditions.push(eq(installationEvidenceTable.branchId, parseInt(branchId as string)));
    }
    if (startDate) {
      conditions.push(gte(installationEvidenceTable.createdAt, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(installationEvidenceTable.createdAt, new Date(endDate as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: installationEvidenceTable.id,
        uuid: installationEvidenceTable.uuid,
        allocationId: installationEvidenceTable.allocationId,
        trackingId: installationEvidenceTable.trackingId,
        branchId: installationEvidenceTable.branchId,
        branchName: branchesTable.name,
        capturedBy: installationEvidenceTable.capturedBy,
        capturedByName: usersTable.fullName,
        technicianNames: installationEvidenceTable.technicianNames,
        technicianIds: installationEvidenceTable.technicianIds,
        photoUrl: installationEvidenceTable.photoUrl,
        photoAfterUrl: installationEvidenceTable.photoAfterUrl,
        latitude: installationEvidenceTable.latitude,
        longitude: installationEvidenceTable.longitude,
        status: installationEvidenceTable.status,
        createdAt: installationEvidenceTable.createdAt,
        clientCaptureTime: installationEvidenceTable.clientCaptureTime,
        itemName: itemsTable.name,
        itemCode: itemsTable.code,
        quantity: installationAllocationsTable.quantity,
        referenceNo: stockOutTable.referenceNo,
      })
      .from(installationEvidenceTable)
      .leftJoin(branchesTable, eq(installationEvidenceTable.branchId, branchesTable.id))
      .leftJoin(usersTable, eq(installationEvidenceTable.capturedBy, usersTable.id))
      .leftJoin(installationAllocationsTable, eq(installationEvidenceTable.allocationId, installationAllocationsTable.id))
      .leftJoin(materialTrackingTable, eq(installationEvidenceTable.trackingId, materialTrackingTable.id))
      .leftJoin(stockOutItemsTable, eq(materialTrackingTable.transactionItemId, stockOutItemsTable.id))
      .leftJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
      .leftJoin(stockOutTable, eq(stockOutItemsTable.stockOutId, stockOutTable.id))
      .where(whereClause)
      .orderBy(desc(installationEvidenceTable.createdAt));

    // Rekap per teknisi
    const techMap = new Map<string, { name: string; count: number; totalUnits: number; branchName: string; verifiedCount: number }>();

    for (const r of rows) {
      const rawNames = r.technicianNames 
        ? r.technicianNames.split(",").map(n => n.trim()).filter(Boolean)
        : [r.capturedByName || "Teknisi Lapangan"];

      for (const name of rawNames) {
        if (!techMap.has(name)) {
          techMap.set(name, {
            name,
            count: 0,
            totalUnits: 0,
            branchName: r.branchName || "-",
            verifiedCount: 0,
          });
        }
        const entry = techMap.get(name)!;
        entry.count += 1;
        entry.totalUnits += (Number(r.quantity) || 1);
        if (r.status === "TERVERIFIKASI") entry.verifiedCount += 1;
      }
    }

    let leaderboard = Array.from(techMap.values()).sort((a, b) => b.totalUnits - a.totalUnits);
    if (search) {
      const s = String(search).toLowerCase();
      leaderboard = leaderboard.filter(t => t.name.toLowerCase().includes(s) || t.branchName.toLowerCase().includes(s));
    }

    res.json({
      summary: {
        totalInstallations: rows.length,
        totalUnitsInstalled: rows.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0),
        totalTechnicians: techMap.size,
      },
      leaderboard,
      records: rows.map(r => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        clientCaptureTime: r.clientCaptureTime instanceof Date ? r.clientCaptureTime.toISOString() : r.clientCaptureTime,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengambil data laporan teknisi" });
  }
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
