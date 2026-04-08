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

// WAREHOUSES
router.get("/warehouses", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db.select().from(warehousesTable).orderBy(warehousesTable.name);
  res.json(rows.map(r => ({ id: r.id, name: r.name, code: r.code, address: r.address, description: r.description, createdAt: r.createdAt.toISOString() })));
});

router.post("/warehouses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWarehouseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(warehousesTable).values(parsed.data).returning();
  res.status(201).json({ id: row.id, name: row.name, code: row.code, address: row.address, description: row.description, createdAt: row.createdAt.toISOString() });
});

router.patch("/warehouses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWarehouseParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateWarehouseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(warehousesTable).set(parsed.data).where(eq(warehousesTable.id, params.data.id)).returning();
  if (!row) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
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
