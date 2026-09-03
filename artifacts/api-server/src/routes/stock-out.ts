// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, sql, desc } from "drizzle-orm";
import crypto from "crypto";
import { db, stockOutTable, stockOutItemsTable, itemsTable, unitsTable, departmentsTable, usersTable, locationsTable, warehousesTable, auditLogsTable, branchesTable, materialTrackingTable, materialTrackingEventsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { generateRefNo } from "../lib/refgen";
import { StockService } from "../lib/stock-service";

const SLA_DAYS = 7;

const router: IRouter = Router();

// ─── LIST ───
router.get("/stock-out", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const { status, startDate, endDate, search, departmentId, warehouseId } = req.query;

  const conditions: any[] = [];
  if (status) conditions.push(eq(stockOutTable.status, status as string));
  if (departmentId) conditions.push(eq(stockOutTable.departmentId, parseInt(departmentId as string)));
  if (warehouseId) conditions.push(eq(stockOutTable.warehouseId, parseInt(warehouseId as string)));
  if (startDate) conditions.push(gte(stockOutTable.transactionDate, new Date(startDate as string)));
  if (endDate) conditions.push(lte(stockOutTable.transactionDate, new Date(endDate as string)));
  if (search) conditions.push(ilike(stockOutTable.referenceNo, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(stockOutTable).where(whereClause);
  const total = Number(count);

  const rows = await db
    .select({
      id: stockOutTable.id,
      referenceNo: stockOutTable.referenceNo,
      departmentId: stockOutTable.departmentId,
      departmentName: departmentsTable.name,
      warehouseId: stockOutTable.warehouseId,
      warehouseName: warehousesTable.name,
      destinationBranchId: stockOutTable.destinationBranchId,
      destinationBranchName: branchesTable.name,
      requestedBy: stockOutTable.requestedBy,
      status: stockOutTable.status,
      qrToken: stockOutTable.qrToken,
      notes: stockOutTable.notes,
      createdBy: stockOutTable.createdBy,
      createdByName: usersTable.fullName,
      transactionDate: stockOutTable.transactionDate,
      createdAt: stockOutTable.createdAt,
    })
    .from(stockOutTable)
    .leftJoin(departmentsTable, eq(stockOutTable.departmentId, departmentsTable.id))
    .leftJoin(warehousesTable, eq(stockOutTable.warehouseId, warehousesTable.id))
    .leftJoin(branchesTable, eq(stockOutTable.destinationBranchId, branchesTable.id))
    .leftJoin(usersTable, eq(stockOutTable.createdBy, usersTable.id))
    .where(whereClause)
    .orderBy(desc(stockOutTable.createdAt))
    .limit(limit)
    .offset(offset);

  const result = await Promise.all(rows.map(async (row) => {
    const [itemCount] = await db.select({ count: sql<number>`count(*)` }).from(stockOutItemsTable).where(eq(stockOutItemsTable.stockOutId, row.id));
    return {
      ...row,
      totalItems: Number(itemCount.count),
      transactionDate: row.transactionDate instanceof Date ? row.transactionDate.toISOString() : new Date(row.transactionDate).toISOString(),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
    };
  }));

  res.json({ data: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// ─── CREATE ───
router.post("/stock-out", requireAuth, async (req, res): Promise<void> => {
  let { departmentId, warehouseId, destinationBranchId, requestedBy, notes, transactionDate, items, details, autoFinalize } = req.body;
  const rawItems = items || details || [];

  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    res.status(400).json({ error: "Minimal 1 item harus diisi" }); return;
  }

  const rawDate = transactionDate || req.body.date || new Date();
  const txDate = new Date(rawDate);
  const refNo = req.body.referenceNumber || req.body.referenceNo || generateRefNo("BK");

  // Jika warehouseId belum dipilih, ambil default gudang pusat/pertama
  if (!warehouseId) {
    const [defWh] = await db.select().from(warehousesTable).limit(1);
    warehouseId = defWh ? defWh.id : null;
  } else {
    warehouseId = parseInt(warehouseId);
  }

  // Jika departmentId dipilih dan merujuk ke cabang, sinkronkan ke destinationBranchId
  if (departmentId) {
    departmentId = parseInt(departmentId);
    if (!destinationBranchId) {
      const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, departmentId));
      if (dept) {
        const [matchedBranch] = await db.select().from(branchesTable).where(eq(branchesTable.name, dept.name)).limit(1);
        if (matchedBranch) {
          destinationBranchId = matchedBranch.id;
        }
      }
    }
  } else if (destinationBranchId) {
    destinationBranchId = parseInt(destinationBranchId);
  }

  // Validasi stok sebelum disimpan
  for (const item of rawItems) {
    if (!item.itemId || !item.quantity || item.quantity <= 0) continue;
    const [itm] = await db.select().from(itemsTable).where(eq(itemsTable.id, item.itemId));
    if (itm) {
      const availStock = itm.currentStock ?? 0;
      if (item.quantity > availStock) {
        res.status(400).json({
          error: `Stok tidak mencukupi untuk "${itm.name}". Stok tersedia: ${availStock}, diminta: ${item.quantity}.`
        });
        return;
      }
    }
  }

  const [header] = await db.insert(stockOutTable).values({
    referenceNo: refNo,
    departmentId: departmentId ?? null,
    warehouseId: warehouseId ?? null,
    destinationBranchId: destinationBranchId ?? null,
    requestedBy: requestedBy ?? null,
    notes: notes ?? null,
    createdBy: req.session.userId ?? null,
    transactionDate: txDate,
    status: autoFinalize ? "DIKIRIM" : (req.body.status || "DRAFT"),
  }).returning();

  for (const item of rawItems) {
    if (!item.itemId || !item.quantity || item.quantity <= 0) continue;
    await db.insert(stockOutItemsTable).values({
      stockOutId: header.id,
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice || 0),
      locationId: item.locationId ?? null,
      notes: item.notes ?? null,
    });
  }

  // Jika autoFinalize dan warehouseId ada, langsung jalankan finalisasi (kurangi stok & buat tracking)
  if (autoFinalize && warehouseId) {
    const txItems = await db
      .select({
        id: stockOutItemsTable.id,
        itemId: stockOutItemsTable.itemId,
        quantity: stockOutItemsTable.quantity,
        trackingType: itemsTable.trackingType,
      })
      .from(stockOutItemsTable)
      .leftJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
      .where(eq(stockOutItemsTable.stockOutId, header.id));

    const hasTracked = txItems.some(i => i.trackingType === "TRACKED");
    await db.transaction(async (tx) => {
      const releasedAt = new Date();
      const slaDeadline = new Date(releasedAt.getTime() + SLA_DAYS * 24 * 60 * 60 * 1000);

      // Kurangi stok untuk semua item
      for (const item of txItems) {
        await StockService.decreaseStock(tx, item.itemId, warehouseId, item.quantity, {
          referenceType: "stock_out",
          referenceId: header.id,
          referenceNo: header.referenceNo,
          userId: req.session.userId,
          movementDate: header.transactionDate,
        });
      }

      // Generate QR token jika ada TRACKED material
      let qrToken = null;
      if (hasTracked) {
        qrToken = crypto.randomUUID();
      }

      await tx.update(stockOutTable).set({
        status: "DIKIRIM",
        releasedAt,
        qrToken,
      }).where(eq(stockOutTable.id, header.id));

      if (hasTracked && header.destinationBranchId) {
        for (const item of txItems) {
          if (item.trackingType !== "TRACKED") continue;
          const [tracking] = await tx.insert(materialTrackingTable).values({
            transactionItemId: item.id,
            branchId: header.destinationBranchId,
            status: "MENUNGGU_DITERIMA",
            slaStartAt: releasedAt,
            slaDeadlineAt: slaDeadline,
          }).returning();

          await tx.insert(materialTrackingEventsTable).values({
            trackingId: tracking.id,
            eventType: "WAREHOUSE_RELEASED",
            userId: req.session.userId,
            metadata: { transactionId: header.id, referenceNo: header.referenceNo, qrToken },
          });
        }
      }
    });
  }

  await db.insert(auditLogsTable).values({
    entityType: "stock_out",
    entityId: header.id,
    action: autoFinalize ? "create_and_finalize" : "create",
    description: `Barang keluar ${refNo} ${autoFinalize ? "dibuat dan langsung dikirim (stok berkurang)" : "dibuat (draft)"}`,
    userId: req.session.userId,
  });

  res.status(201).json({ ...header, referenceNo: refNo });
});

// ─── GET DETAIL ───
router.get("/stock-out/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [header] = await db
    .select({
      id: stockOutTable.id,
      referenceNo: stockOutTable.referenceNo,
      departmentId: stockOutTable.departmentId,
      departmentName: departmentsTable.name,
      warehouseId: stockOutTable.warehouseId,
      warehouseName: warehousesTable.name,
      destinationBranchId: stockOutTable.destinationBranchId,
      destinationBranchName: branchesTable.name,
      requestedBy: stockOutTable.requestedBy,
      status: stockOutTable.status,
      qrToken: stockOutTable.qrToken,
      releasedAt: stockOutTable.releasedAt,
      notes: stockOutTable.notes,
      createdByName: usersTable.fullName,
      transactionDate: stockOutTable.transactionDate,
      createdAt: stockOutTable.createdAt,
    })
    .from(stockOutTable)
    .leftJoin(departmentsTable, eq(stockOutTable.departmentId, departmentsTable.id))
    .leftJoin(warehousesTable, eq(stockOutTable.warehouseId, warehousesTable.id))
    .leftJoin(branchesTable, eq(stockOutTable.destinationBranchId, branchesTable.id))
    .leftJoin(usersTable, eq(stockOutTable.createdBy, usersTable.id))
    .where(eq(stockOutTable.id, id));

  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }

  const items = await db
    .select({
      id: stockOutItemsTable.id,
      itemId: stockOutItemsTable.itemId,
      itemCode: itemsTable.code,
      itemName: itemsTable.name,
      unitName: unitsTable.name,
      quantity: stockOutItemsTable.quantity,
      unitPrice: stockOutItemsTable.unitPrice,
      locationId: stockOutItemsTable.locationId,
      locationName: locationsTable.name,
      notes: stockOutItemsTable.notes,
    })
    .from(stockOutItemsTable)
    .leftJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
    .leftJoin(unitsTable, eq(itemsTable.unitId, unitsTable.id))
    .leftJoin(locationsTable, eq(stockOutItemsTable.locationId, locationsTable.id))
    .where(eq(stockOutItemsTable.stockOutId, id));

  res.json({
    ...header,
    transactionDate: header.transactionDate instanceof Date ? header.transactionDate.toISOString() : new Date(header.transactionDate).toISOString(),
    createdAt: header.createdAt instanceof Date ? header.createdAt.toISOString() : new Date(header.createdAt).toISOString(),
    releasedAt: header.releasedAt instanceof Date ? header.releasedAt.toISOString() : header.releasedAt ? new Date(header.releasedAt).toISOString() : null,
    items: items.map(i => ({ ...i, unitPrice: parseFloat(String(i.unitPrice)) })),
  });
});

// ─── FINALIZE (decreases stock, generates QR, creates tracking for TRACKED items) ───
router.post("/stock-out/:id/finalize", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [header] = await db.select().from(stockOutTable).where(eq(stockOutTable.id, id));
  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  if (header.status === "DIKIRIM") { res.status(400).json({ error: "Sudah difinalisasi" }); return; }
  if (header.status === "DIBATALKAN") { res.status(400).json({ error: "Transaksi sudah dibatalkan" }); return; }

  const txItems = await db
    .select({
      id: stockOutItemsTable.id,
      itemId: stockOutItemsTable.itemId,
      quantity: stockOutItemsTable.quantity,
      trackingType: itemsTable.trackingType,
    })
    .from(stockOutItemsTable)
    .leftJoin(itemsTable, eq(stockOutItemsTable.itemId, itemsTable.id))
    .where(eq(stockOutItemsTable.stockOutId, header.id));

  if (txItems.length === 0) { res.status(400).json({ error: "Tidak ada item dalam transaksi" }); return; }

  const warehouseId = header.warehouseId;
  if (!warehouseId) { res.status(400).json({ error: "Gudang belum dipilih" }); return; }

  const hasTracked = txItems.some(i => i.trackingType === "TRACKED");
  const needsBranch = hasTracked && !header.destinationBranchId;
  if (needsBranch) { res.status(400).json({ error: "Transaksi berisi material TRACKED, cabang tujuan wajib dipilih" }); return; }

  try {
    await db.transaction(async (tx) => {
      const releasedAt = new Date();
      const slaDeadline = new Date(releasedAt.getTime() + SLA_DAYS * 24 * 60 * 60 * 1000);

      // Decrease stock for all items
      for (const item of txItems) {
        await StockService.decreaseStock(tx, item.itemId, warehouseId, item.quantity, {
          referenceType: "stock_out",
          referenceId: header.id,
          referenceNo: header.referenceNo,
          userId: req.session.userId,
          movementDate: header.transactionDate,
        });
      }

      // Generate QR token if any TRACKED items (Section 8)
      let qrToken = null;
      if (hasTracked) {
        qrToken = crypto.randomUUID();
      }

      // Update header status
      await tx.update(stockOutTable).set({
        status: "DIKIRIM",
        releasedAt,
        qrToken,
      }).where(eq(stockOutTable.id, header.id));

      // Create material_tracking for each TRACKED item (Section 11)
      for (const item of txItems) {
        if (item.trackingType !== "TRACKED") continue;

        const [tracking] = await tx.insert(materialTrackingTable).values({
          transactionItemId: item.id,
          branchId: header.destinationBranchId!,
          status: "MENUNGGU_DITERIMA",
          slaStartAt: releasedAt,
          slaDeadlineAt: slaDeadline,
        }).returning();

        // Record event
        await tx.insert(materialTrackingEventsTable).values({
          trackingId: tracking.id,
          eventType: "WAREHOUSE_RELEASED",
          userId: req.session.userId,
          metadata: { transactionId: header.id, referenceNo: header.referenceNo, qrToken },
        });
      }
    });
  } catch (err: any) {
    if (err.message?.includes("Stok tidak mencukupi")) {
      res.status(400).json({ error: err.message }); return;
    }
    throw err;
  }

  await db.insert(auditLogsTable).values({
    entityType: "stock_out",
    entityId: header.id,
    action: "finalize",
    description: `Barang keluar ${header.referenceNo} difinalisasi, stok berkurang`,
    userId: req.session.userId,
  });

  res.json({ message: "Berhasil difinalisasi" });
});

// ─── VOID ───
router.post("/stock-out/:id/void", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }

  const [header] = await db.select().from(stockOutTable).where(eq(stockOutTable.id, id));
  if (!header) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  if (header.status === "void") { res.status(400).json({ error: "Sudah dibatalkan" }); return; }

  const warehouseId = header.warehouseId;
  const wasFinalized = header.status === "finalized";

  await db.transaction(async (tx) => {
    if (wasFinalized && warehouseId) {
      const items = await tx.select().from(stockOutItemsTable).where(eq(stockOutItemsTable.stockOutId, header.id));
      for (const item of items) {
        await StockService.reverseStock(tx, item.itemId, warehouseId, item.quantity, "out", {
          referenceType: "stock_out",
          referenceId: header.id,
          referenceNo: header.referenceNo,
          userId: req.session.userId,
        });
      }
    }
    await tx.update(stockOutTable).set({ status: "void" }).where(eq(stockOutTable.id, header.id));
  });

  await db.insert(auditLogsTable).values({
    entityType: "stock_out",
    entityId: header.id,
    action: "void",
    description: `Barang keluar ${header.referenceNo} dibatalkan${wasFinalized ? ", stok dikembalikan" : ""}`,
    userId: req.session.userId,
  });

  res.json({ message: "Berhasil dibatalkan" });
});

export default router;
