// @ts-nocheck
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable, unitsTable, suppliersTable, warehousesTable, locationsTable, departmentsTable } from "@workspace/db";
import {
  CreateCategoryBody, UpdateCategoryBody, UpdateCategoryParams, DeleteCategoryParams,
  CreateUnitBody, UpdateUnitBody, UpdateUnitParams, DeleteUnitParams,
  CreateSupplierBody, UpdateSupplierBody, UpdateSupplierParams, DeleteSupplierParams,
  CreateWarehouseBody, UpdateWarehouseBody, UpdateWarehouseParams, DeleteWarehouseParams,
  ListLocationsQueryParams, CreateLocationBody, UpdateLocationBody, UpdateLocationParams, DeleteLocationParams,
  CreateDepartmentBody, UpdateDepartmentBody, UpdateDepartmentParams, DeleteDepartmentParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// CATEGORIES
router.get("/categories", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(rows.map(r => ({
    id: r.id, name: r.name, description: r.description,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/categories", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(categoriesTable).values(parsed.data).returning();
  res.status(201).json({ id: row.id, name: row.name, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.patch("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(categoriesTable).set(parsed.data).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  res.json({ id: row.id, name: row.name, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.delete("/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id));
  res.sendStatus(204);
});

// UNITS
router.get("/units", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(unitsTable).orderBy(unitsTable.name);
  res.json(rows.map(r => ({ id: r.id, name: r.name, abbreviation: r.abbreviation, createdAt: r.createdAt.toISOString() })));
});

router.post("/units", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateUnitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(unitsTable).values(parsed.data).returning();
  res.status(201).json({ id: row.id, name: row.name, abbreviation: row.abbreviation, createdAt: row.createdAt.toISOString() });
});

router.patch("/units/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateUnitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateUnitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(unitsTable).set(parsed.data).where(eq(unitsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  res.json({ id: row.id, name: row.name, abbreviation: row.abbreviation, createdAt: row.createdAt.toISOString() });
});

router.delete("/units/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteUnitParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(unitsTable).where(eq(unitsTable.id, params.data.id));
  res.sendStatus(204);
});

// SUPPLIERS
router.get("/suppliers", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  res.json(rows.map(r => ({ id: r.id, name: r.name, contact: r.contact, phone: r.phone, address: r.address, email: r.email, createdAt: r.createdAt.toISOString() })));
});

router.post("/suppliers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(suppliersTable).values(parsed.data).returning();
  res.status(201).json({ id: row.id, name: row.name, contact: row.contact, phone: row.phone, address: row.address, email: row.email, createdAt: row.createdAt.toISOString() });
});

router.patch("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSupplierParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSupplierBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(suppliersTable).set(parsed.data).where(eq(suppliersTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  res.json({ id: row.id, name: row.name, contact: row.contact, phone: row.phone, address: row.address, email: row.email, createdAt: row.createdAt.toISOString() });
});

router.delete("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSupplierParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(suppliersTable).where(eq(suppliersTable.id, params.data.id));
  res.sendStatus(204);
});

// 12 Unit Cabang Perumdam Tirta Ardhia Rinjani (Kabupaten Lombok Tengah)
const DEFAULT_BRANCHES_DATA = [
  { code: "CBG-PRY", name: "Cabang Praya", address: "Jl. Soekarno-Hatta, Praya, Kec. Praya", description: "Unit Pelayanan & Gudang Cabang Praya", lat: "-8.7063000", lon: "116.2704000" },
  { code: "CBG-PRT", name: "Cabang Praya Tengah", address: "Jl. Raya Batunyala, Kec. Praya Tengah", description: "Unit Pelayanan & Gudang Cabang Praya Tengah", lat: "-8.7120000", lon: "116.3010000" },
  { code: "CBG-PRB", name: "Cabang Praya Barat", address: "Jl. Raya Penujak, Kec. Praya Barat", description: "Unit Pelayanan & Gudang Cabang Praya Barat", lat: "-8.7512000", lon: "116.2084000" },
  { code: "CBG-PBD", name: "Cabang Praya Barat Daya", address: "Jl. Raya Darek, Kec. Praya Barat Daya", description: "Unit Pelayanan & Gudang Cabang Praya Barat Daya", lat: "-8.7750000", lon: "116.1750000" },
  { code: "CBG-PRM", name: "Cabang Praya Timur", address: "Jl. Raya Mujur, Kec. Praya Timur", description: "Unit Pelayanan & Gudang Cabang Praya Timur", lat: "-8.7200000", lon: "116.3400000" },
  { code: "CBG-PJT", name: "Cabang Pujut", address: "Jl. Pariwisata Kuta, Sengkol, Kec. Pujut", description: "Unit Pelayanan & Gudang Cabang Pujut", lat: "-8.8475000", lon: "116.2818000" },
  { code: "CBG-JGT", name: "Cabang Jonggat", address: "Jl. Raya Ubung, Puyung, Kec. Jonggat", description: "Unit Pelayanan & Gudang Cabang Jonggat", lat: "-8.6720000", lon: "116.2165000" },
  { code: "CBG-KPG", name: "Cabang Kopang", address: "Jl. Raya Kopang, Kec. Kopang", description: "Unit Pelayanan & Gudang Cabang Kopang", lat: "-8.6416000", lon: "116.3262000" },
  { code: "CBG-JNP", name: "Cabang Janapria", address: "Jl. Raya Janapria, Kec. Janapria", description: "Unit Pelayanan & Gudang Cabang Janapria", lat: "-8.6850000", lon: "116.3750000" },
  { code: "CBG-PGA", name: "Cabang Pringgarata", address: "Jl. Raya Pringgarata, Kec. Pringgarata", description: "Unit Pelayanan & Gudang Cabang Pringgarata", lat: "-8.6015000", lon: "116.2230000" },
  { code: "CBG-BKL", name: "Cabang Batukliang", address: "Jl. Raya Mantang, Kec. Batukliang", description: "Unit Pelayanan & Gudang Cabang Batukliang", lat: "-8.6180000", lon: "116.2870000" },
  { code: "CBG-BKU", name: "Cabang Batukliang Utara", address: "Jl. Raya Teratak, Kec. Batukliang Utara", description: "Unit Pelayanan & Gudang Cabang Batukliang Utara", lat: "-8.5700000", lon: "116.3050000" },
];

let warehousesSynced = false;

// WAREHOUSES & CABANG
router.get("/warehouses", requireAuth, async (_req, res): Promise<void> => {
  // Ensure the 12 branches exist in warehousesTable on demand
  if (!warehousesSynced) {
    try {
      const existingWh = await db.select().from(warehousesTable);
      const existingCodes = new Set(existingWh.map(w => (w.code || "").toUpperCase()));
      const existingNames = new Set(existingWh.map(w => (w.name || "").toLowerCase()));

      for (const b of DEFAULT_BRANCHES_DATA) {
        if (!existingCodes.has(b.code.toUpperCase()) && !existingNames.has(b.name.toLowerCase())) {
          await db.insert(warehousesTable).values({
            code: b.code,
            name: b.name,
            address: b.address,
            description: b.description,
          });
        }
      }

      // Also ensure branchesTable has the 12 branches
      const existingBr = await db.select().from(branchesTable);
      const existingBrNames = new Set(existingBr.map(br => (br.name || "").toLowerCase().trim()));

      for (const b of DEFAULT_BRANCHES_DATA) {
        if (!existingBrNames.has(b.name.toLowerCase().trim())) {
          await db.insert(branchesTable).values({
            name: b.name,
            address: b.address,
            latitude: b.lat,
            longitude: b.lon,
            status: "active",
          });
        }
      }
      warehousesSynced = true;
    } catch (err) {
      console.error("Error auto-syncing branch warehouses:", err);
    }
  }

  const rows = await db.select().from(warehousesTable).orderBy(warehousesTable.name);
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    code: r.code,
    address: r.address,
    description: r.description,
    isBranch: r.code?.startsWith("CBG") || r.name.toLowerCase().includes("cabang"),
    createdAt: r.createdAt.toISOString()
  })));
});

router.post("/warehouses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWarehouseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(warehousesTable).values(parsed.data).returning();

  // If this warehouse is a branch, also sync to branchesTable
  if (row.code?.startsWith("CBG") || row.name.toLowerCase().includes("cabang")) {
    try {
      const [existingBr] = await db.select().from(branchesTable).where(eq(branchesTable.name, row.name));
      if (!existingBr) {
        await db.insert(branchesTable).values({
          name: row.name,
          address: row.address ?? null,
          status: "active",
        });
      }
    } catch (e) {
      console.warn("Sync to branchesTable skipped:", e);
    }
  }

  res.status(201).json({ id: row.id, name: row.name, code: row.code, address: row.address, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.patch("/warehouses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWarehouseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateWarehouseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(warehousesTable).set(parsed.data).where(eq(warehousesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }

  // Sync update to branch if applicable
  if (row.name) {
    try {
      await db.update(branchesTable).set({
        address: row.address,
      }).where(eq(branchesTable.name, row.name));
    } catch (e) {
      console.warn("Branch sync skipped:", e);
    }
  }

  res.json({ id: row.id, name: row.name, code: row.code, address: row.address, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.delete("/warehouses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteWarehouseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(warehousesTable).where(eq(warehousesTable.id, params.data.id));
  res.sendStatus(204);
});

// LOCATIONS
router.get("/locations", requireAuth, async (req, res): Promise<void> => {
  const qp = ListLocationsQueryParams.safeParse(req.query);
  const rows = await db
    .select({
      id: locationsTable.id,
      warehouseId: locationsTable.warehouseId,
      warehouseName: warehousesTable.name,
      name: locationsTable.name,
      code: locationsTable.code,
      description: locationsTable.description,
      createdAt: locationsTable.createdAt,
    })
    .from(locationsTable)
    .leftJoin(warehousesTable, eq(locationsTable.warehouseId, warehousesTable.id))
    .orderBy(locationsTable.name);
  const filtered = qp.success && qp.data.warehouseId
    ? rows.filter(r => r.warehouseId === qp.data.warehouseId)
    : rows;
  res.json(filtered.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/locations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(locationsTable).values(parsed.data).returning();
  const [wh] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, row.warehouseId));
  res.status(201).json({ id: row.id, warehouseId: row.warehouseId, warehouseName: wh?.name ?? null, name: row.name, code: row.code, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.patch("/locations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLocationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateLocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(locationsTable).set(parsed.data).where(eq(locationsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  res.json({ id: row.id, warehouseId: row.warehouseId, warehouseName: null, name: row.name, code: row.code, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.delete("/locations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLocationParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(locationsTable).where(eq(locationsTable.id, params.data.id));
  res.sendStatus(204);
});

// DEPARTMENTS
router.get("/departments", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
  res.json(rows.map(r => ({ id: r.id, name: r.name, code: r.code, description: r.description, createdAt: r.createdAt.toISOString() })));
});

router.post("/departments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(departmentsTable).values(parsed.data).returning();
  res.status(201).json({ id: row.id, name: row.name, code: row.code, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.patch("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDepartmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(departmentsTable).set(parsed.data).where(eq(departmentsTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
  res.json({ id: row.id, name: row.name, code: row.code, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.delete("/departments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteDepartmentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(departmentsTable).where(eq(departmentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
