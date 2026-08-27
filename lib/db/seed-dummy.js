/**
 * seed-dummy.js — Insert realistic PDAM warehouse data into SI GAPLEK database.
 * 
 * Usage: node lib/db/seed-dummy.js
 * 
 * Inserts: categories, units, suppliers, departments, warehouses, locations, racks,
 * branches, items, stock_in, stock_out, stock_balances, material_tracking,
 * installation_allocations, installation_evidence, audit_logs
 */
const { Client } = require('pg');

const conString = 'postgresql://neondb_owner:npg_v2u3wqXQinaH@ep-ancient-hall-azqpoba3-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

function d(daysAgo) {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString();
}

async function run() {
    const client = new Client({ connectionString: conString });
    await client.connect();
    console.log('Connected to Neon PostgreSQL.');

    // ─── CATEGORIES ──────────────────
    console.log('Seeding categories...');
    const catRows = [
        ['Pipa', 'Material pipa HDPE dan PVC'],
        ['Meter Air', 'Water meter berbagai ukuran'],
        ['Aksesoris Pipa', 'Fitting, tee, elbow, reducer'],
        ['Valve', 'Gate valve, ball valve, butterfly valve'],
        ['Alat Ukur', 'Pressure gauge, flow meter portabel'],
        ['Bahan Kimia', 'Kaporit, tawas, PAC'],
        ['Material Listrik', 'Kabel, MCB, pompa submersible'],
        ['Alat Kerja', 'Perkakas dan alat berat kecil'],
    ];
    for (const [name, desc] of catRows) {
        await client.query(`INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`, [name, desc]);
    }

    // ─── UNITS ──────────────────
    console.log('Seeding units...');
    const unitRows = [
        ['Buah', 'bh'], ['Meter', 'm'], ['Lonjor', 'ljr'], ['Kilogram', 'kg'],
        ['Liter', 'ltr'], ['Set', 'set'], ['Roll', 'roll'], ['Batang', 'btg'], ['Lembar', 'lbr'], ['Dus', 'dus'],
    ];
    for (const [name, abbr] of unitRows) {
        await client.query(`INSERT INTO units (name, abbreviation) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`, [name, abbr]);
    }

    // ─── SUPPLIERS ──────────────────
    console.log('Seeding suppliers...');
    const supplierRows = [
        ['PT Maspion Pipa', 'Budi Santoso', '031-8765432', 'Jl. Industri 12 Surabaya'],
        ['CV Tirta Supply', 'Ahmad Reza', '0370-612345', 'Jl. Pejanggik 55 Mataram'],
        ['PT Itron Indonesia', 'Diana Putri', '021-5553210', 'Jl. TB Simatupang Jakarta'],
        ['UD Lombok Jaya', 'Hasan Basri', '0370-645678', 'Jl. Sriwijaya 8 Mataram'],
        ['PT Wavin Duta Jaya', 'Rina Wati', '024-7654321', 'Jl. Gatot Subroto Semarang'],
    ];
    for (const [name, contact, phone, address] of supplierRows) {
        await client.query(`INSERT INTO suppliers (name, contact, phone, address) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [name, contact, phone, address]);
    }

    // ─── DEPARTMENTS ──────────────────
    console.log('Seeding departments...');
    const deptRows = [
        ['Distribusi', 'DIST', 'Unit distribusi air bersih'],
        ['Produksi', 'PROD', 'Unit produksi/pengolahan air'],
        ['Perencanaan', 'PLAN', 'Unit perencanaan teknis'],
        ['Pelayanan', 'PLAY', 'Unit pelayanan pelanggan'],
        ['Keuangan', 'KEU', 'Unit keuangan dan akuntansi'],
    ];
    for (const [name, code, desc] of deptRows) {
        await client.query(`INSERT INTO departments (name, code, description) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`, [name, code, desc]);
    }

    // ─── WAREHOUSES ──────────────────
    console.log('Seeding warehouses...');
    const whRows = [
        ['Gudang Utama Mataram', 'GU-MTR', 'Jl. Industri 1 Mataram', '-8.5800000', '116.1100000'],
        ['Gudang Transit Senggigi', 'GT-SGG', 'Jl. Raya Senggigi KM 5', '-8.4930000', '116.0450000'],
    ];
    for (const [name, code, addr, lat, lon] of whRows) {
        await client.query(`INSERT INTO warehouses (name, code, address, latitude, longitude) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (code) DO NOTHING`,
            [name, code, addr, lat, lon]);
    }

    // Get warehouse IDs
    const whRes = await client.query(`SELECT id, code FROM warehouses ORDER BY id`);
    const whMap = {};
    whRes.rows.forEach(r => whMap[r.code] = r.id);
    const mainWarehouseId = whMap['GU-MTR'] || whRes.rows[0]?.id;

    // ─── LOCATIONS ──────────────────
    console.log('Seeding locations...');
    const locRows = [
        [mainWarehouseId, 'Zona A - Pipa', 'ZA'],
        [mainWarehouseId, 'Zona B - Meter Air', 'ZB'],
        [mainWarehouseId, 'Zona C - Aksesoris', 'ZC'],
        [mainWarehouseId, 'Zona D - Bahan Kimia', 'ZD'],
    ];
    for (const [whId, name, code] of locRows) {
        await client.query(`INSERT INTO locations (warehouse_id, name, code) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [whId, name, code]);
    }

    const locRes = await client.query(`SELECT id, code FROM locations WHERE warehouse_id = $1 ORDER BY id`, [mainWarehouseId]);
    const locMap = {};
    locRes.rows.forEach(r => locMap[r.code] = r.id);

    // ─── RACKS ──────────────────
    console.log('Seeding racks...');
    const firstLocId = locRes.rows[0]?.id;
    if (firstLocId) {
        const rackRows = [
            [firstLocId, 'Rak A-1', 'RAK-A1'],
            [firstLocId, 'Rak A-2', 'RAK-A2'],
            [firstLocId, 'Rak A-3', 'RAK-A3'],
        ];
        for (const [lid, name, code] of rackRows) {
            await client.query(`INSERT INTO racks (location_id, name, code) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING`, [lid, name, code]);
        }
    }

    // ─── BRANCHES ──────────────────
    console.log('Seeding branches...');
    const branchRows = [
        ['Cabang Ampenan', 'Jl. Langko 10, Ampenan', '-8.5750000', '116.0800000'],
        ['Cabang Cakranegara', 'Jl. AA Gede Ngurah, Cakra', '-8.5830000', '116.1300000'],
        ['Cabang Mataram', 'Jl. Pejanggik 45, Mataram', '-8.5900000', '116.1050000'],
        ['Cabang Sandubaya', 'Jl. Sandubaya 22', '-8.6000000', '116.1500000'],
        ['Cabang Sekarbela', 'Jl. Gili Air 5, Sekarbela', '-8.6050000', '116.0900000'],
        ['Cabang Gunungsari', 'Jl. Raya Gunungsari KM2', '-8.5600000', '116.0700000'],
    ];
    for (const [name, addr, lat, lon] of branchRows) {
        await client.query(`INSERT INTO branches (name, address, latitude, longitude) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [name, addr, lat, lon]);
    }

    const brRes = await client.query(`SELECT id, name FROM branches ORDER BY id`);
    const branches = brRes.rows;

    // Get IDs needed
    const catRes = await client.query(`SELECT id, name FROM categories ORDER BY id`);
    const catMap = {};
    catRes.rows.forEach(r => catMap[r.name] = r.id);

    const unitRes = await client.query(`SELECT id, name FROM units ORDER BY id`);
    const unitMap = {};
    unitRes.rows.forEach(r => unitMap[r.name] = r.id);

    const supRes = await client.query(`SELECT id, name FROM suppliers ORDER BY id`);
    const suppliers = supRes.rows;

    const userRes = await client.query(`SELECT id, username, role FROM users ORDER BY id`);
    const userMap = {};
    userRes.rows.forEach(r => userMap[r.username] = r.id);

    const deptRes = await client.query(`SELECT id, code FROM departments ORDER BY id`);
    const deptMap = {};
    deptRes.rows.forEach(r => deptMap[r.code] = r.id);

    // Update cabang1 user branch_id
    if (userMap['cabang1'] && branches[0]) {
        await client.query(`UPDATE users SET branch_id = $1 WHERE id = $2`, [branches[0].id, userMap['cabang1']]);
    }

    // ─── ITEMS ──────────────────
    console.log('Seeding items...');
    const itemRows = [
        ['MTR-001', 'Meter Air DN 15mm', catMap['Meter Air'], unitMap['Buah'], 100, 500, 245, '185000', 'TRACKED', true],
        ['MTR-002', 'Meter Air DN 20mm', catMap['Meter Air'], unitMap['Buah'], 50, 200, 87, '275000', 'TRACKED', true],
        ['PPA-001', 'Pipa HDPE D63 PN10', catMap['Pipa'], unitMap['Lonjor'], 50, 300, 180, '125000', 'TRACKED', false],
        ['PPA-002', 'Pipa HDPE D90 PN10', catMap['Pipa'], unitMap['Lonjor'], 30, 200, 95, '210000', 'TRACKED', false],
        ['PPA-003', 'Pipa PVC D50 AW', catMap['Pipa'], unitMap['Batang'], 100, 500, 320, '45000', 'NON_TRACKED', false],
        ['AKS-001', 'Tee HDPE D63', catMap['Aksesoris Pipa'], unitMap['Buah'], 100, 500, 210, '35000', 'NON_TRACKED', false],
        ['AKS-002', 'Elbow 90° HDPE D63', catMap['Aksesoris Pipa'], unitMap['Buah'], 100, 500, 175, '28000', 'NON_TRACKED', false],
        ['AKS-003', 'Reducer HDPE D90-D63', catMap['Aksesoris Pipa'], unitMap['Buah'], 50, 200, 65, '42000', 'NON_TRACKED', false],
        ['VLV-001', 'Gate Valve D63', catMap['Valve'], unitMap['Buah'], 20, 100, 35, '350000', 'TRACKED', false],
        ['VLV-002', 'Ball Valve D50', catMap['Valve'], unitMap['Buah'], 20, 100, 48, '180000', 'NON_TRACKED', false],
        ['KIM-001', 'Kaporit Granul', catMap['Bahan Kimia'], unitMap['Kilogram'], 200, 1000, 450, '18000', 'NON_TRACKED', false],
        ['KIM-002', 'PAC (Poly Aluminium Chloride)', catMap['Bahan Kimia'], unitMap['Kilogram'], 100, 500, 280, '22000', 'NON_TRACKED', false],
        ['ALK-001', 'Pressure Gauge 0-10 Bar', catMap['Alat Ukur'], unitMap['Buah'], 5, 20, 8, '250000', 'NON_TRACKED', false],
        ['LST-001', 'Kabel NYY 4x6mm', catMap['Material Listrik'], unitMap['Meter'], 100, 500, 230, '45000', 'NON_TRACKED', false],
        ['ALT-001', 'Kunci Pipa 18"', catMap['Alat Kerja'], unitMap['Buah'], 5, 20, 12, '185000', 'NON_TRACKED', false],
        ['MTR-003', 'Meter Air DN 25mm', catMap['Meter Air'], unitMap['Buah'], 30, 100, 42, '425000', 'TRACKED', true],
        ['PPA-004', 'Pipa HDPE D110 PN10', catMap['Pipa'], unitMap['Lonjor'], 20, 100, 35, '385000', 'TRACKED', false],
        ['AKS-004', 'Coupling HDPE D63', catMap['Aksesoris Pipa'], unitMap['Buah'], 50, 200, 15, '32000', 'NON_TRACKED', false],
    ];
    for (const [code, name, catId, uId, minStock, maxStock, curStock, price, trackType, trackSN] of itemRows) {
        await client.query(`
      INSERT INTO items (code, name, category_id, unit_id, minimum_stock, maximum_stock, current_stock, unit_price, tracking_type, track_serial_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (code) DO UPDATE SET current_stock = $7, unit_price = $8
    `, [code, name, catId, uId, minStock, maxStock, curStock, price, trackType, trackSN]);
    }

    const itemRes = await client.query(`SELECT id, code, name, tracking_type FROM items ORDER BY id`);
    const itemMap = {};
    itemRes.rows.forEach(r => itemMap[r.code] = r);

    // ─── STOCK BALANCES ──────────────────
    console.log('Seeding stock_balances...');
    for (const item of itemRes.rows) {
        await client.query(`
      INSERT INTO stock_balances (item_id, warehouse_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT ON CONSTRAINT uq_stock_balance_item_warehouse DO UPDATE SET quantity = $3
    `, [item.id, mainWarehouseId, itemRows.find(r => r[0] === item.code)?.[6] || 0]);
    }

    // ─── STOCK IN (Barang Masuk) ──────────────────
    console.log('Seeding stock_in...');
    const adminId = userMap['admin'] || 1;
    const gudangId = userMap['gudang1'] || 2;

    const stockInData = [
        ['BM-20260801-0001', suppliers[0]?.id, d(25), 'completed', 'Pengadaan Pipa Q3 2026'],
        ['BM-20260805-0002', suppliers[1]?.id, d(21), 'completed', 'Pengadaan Meter Air'],
        ['BM-20260810-0003', suppliers[2]?.id, d(16), 'completed', 'Pengadaan Aksesoris'],
        ['BM-20260815-0004', suppliers[3]?.id, d(11), 'completed', 'Pengadaan Bahan Kimia'],
        ['BM-20260820-0005', suppliers[4]?.id, d(6), 'completed', 'Pengadaan Valve dan Pipa'],
        ['BM-20260825-0006', suppliers[0]?.id, d(2), 'draft', 'Pesanan Tambahan Pipa'],
    ];
    for (const [refNo, supId, txDate, status, notes] of stockInData) {
        await client.query(`
      INSERT INTO stock_in (reference_no, supplier_id, warehouse_id, status, notes, created_by, transaction_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (reference_no) DO NOTHING
    `, [refNo, supId, mainWarehouseId, status, notes, gudangId, txDate]);
    }

    // Stock in items
    const siRes = await client.query(`SELECT id, reference_no FROM stock_in ORDER BY id`);
    const siMap = {};
    siRes.rows.forEach(r => siMap[r.reference_no] = r.id);

    const siItemData = [
        ['BM-20260801-0001', 'PPA-001', 50, '125000'],
        ['BM-20260801-0001', 'PPA-002', 30, '210000'],
        ['BM-20260805-0002', 'MTR-001', 100, '185000'],
        ['BM-20260805-0002', 'MTR-002', 50, '275000'],
        ['BM-20260810-0003', 'AKS-001', 100, '35000'],
        ['BM-20260810-0003', 'AKS-002', 80, '28000'],
        ['BM-20260815-0004', 'KIM-001', 200, '18000'],
        ['BM-20260815-0004', 'KIM-002', 150, '22000'],
        ['BM-20260820-0005', 'VLV-001', 20, '350000'],
        ['BM-20260820-0005', 'PPA-003', 100, '45000'],
    ];
    for (const [refNo, itemCode, qty, price] of siItemData) {
        const siId = siMap[refNo];
        const iId = itemMap[itemCode]?.id;
        if (siId && iId) {
            await client.query(`
        INSERT INTO stock_in_items (stock_in_id, item_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [siId, iId, qty, price]);
        }
    }

    // ─── STOCK OUT (Barang Keluar) ──────────────────
    console.log('Seeding stock_out...');
    const stockOutData = [
        ['BK-20260803-0001', deptMap['DIST'], branches[0]?.id, 'DIKIRIM', d(23), d(23), 'Distribusi meter ke Cabang Ampenan'],
        ['BK-20260807-0002', deptMap['DIST'], branches[1]?.id, 'DIKIRIM', d(19), d(19), 'Distribusi pipa ke Cabang Cakranegara'],
        ['BK-20260812-0003', deptMap['DIST'], branches[2]?.id, 'DIKIRIM', d(14), d(14), 'Distribusi meter ke Cabang Mataram'],
        ['BK-20260816-0004', deptMap['DIST'], branches[3]?.id, 'DIKIRIM', d(10), d(10), 'Distribusi valve ke Cabang Sandubaya'],
        ['BK-20260821-0005', deptMap['DIST'], branches[4]?.id, 'DIPROSES', d(5), null, 'Distribusi pipa ke Cabang Sekarbela'],
        ['BK-20260824-0006', deptMap['DIST'], branches[5]?.id, 'DRAFT', d(2), null, 'Distribusi aksesoris ke Cabang Gunungsari'],
        ['BK-20260810-0007', deptMap['PROD'], null, 'DIKIRIM', d(16), d(16), 'Kebutuhan bahan kimia produksi'],
        ['BK-20260818-0008', deptMap['PLAY'], branches[0]?.id, 'DIKIRIM', d(8), d(8), 'Pergantian meter rusak Ampenan'],
    ];
    for (const [refNo, deptId, branchId, status, txDate, releasedAt, notes] of stockOutData) {
        const qrToken = status === 'DIKIRIM' || status === 'DIPROSES' ? `QR-${refNo}` : null;
        await client.query(`
      INSERT INTO stock_out (reference_no, department_id, warehouse_id, destination_branch_id, status, 
        approval_status, qr_token, released_at, notes, created_by, transaction_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (reference_no) DO NOTHING
    `, [refNo, deptId, mainWarehouseId, branchId, status,
            status === 'DRAFT' ? 'draft' : 'approved', qrToken, releasedAt, notes, gudangId, txDate]);
    }

    const soRes = await client.query(`SELECT id, reference_no, destination_branch_id, released_at FROM stock_out ORDER BY id`);
    const soMap = {};
    soRes.rows.forEach(r => soMap[r.reference_no] = r);

    // Stock out items
    const soItemData = [
        ['BK-20260803-0001', 'MTR-001', 25, '185000'],
        ['BK-20260803-0001', 'AKS-001', 15, '35000'],
        ['BK-20260807-0002', 'PPA-001', 20, '125000'],
        ['BK-20260807-0002', 'PPA-002', 10, '210000'],
        ['BK-20260812-0003', 'MTR-001', 30, '185000'],
        ['BK-20260812-0003', 'MTR-002', 15, '275000'],
        ['BK-20260816-0004', 'VLV-001', 8, '350000'],
        ['BK-20260816-0004', 'AKS-002', 20, '28000'],
        ['BK-20260821-0005', 'PPA-003', 50, '45000'],
        ['BK-20260821-0005', 'AKS-003', 10, '42000'],
        ['BK-20260824-0006', 'AKS-004', 30, '32000'],
        ['BK-20260810-0007', 'KIM-001', 100, '18000'],
        ['BK-20260810-0007', 'KIM-002', 60, '22000'],
        ['BK-20260818-0008', 'MTR-001', 10, '185000'],
        ['BK-20260818-0008', 'MTR-003', 5, '425000'],
    ];
    for (const [refNo, itemCode, qty, price] of soItemData) {
        const soId = soMap[refNo]?.id;
        const iId = itemMap[itemCode]?.id;
        if (soId && iId) {
            await client.query(`
        INSERT INTO stock_out_items (stock_out_id, item_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [soId, iId, qty, price]);
        }
    }

    // Get stock_out_items IDs for tracking
    const soiRes = await client.query(`
    SELECT soi.id, soi.stock_out_id, soi.item_id, soi.quantity, i.tracking_type, i.code as item_code,
           so.destination_branch_id, so.released_at, so.reference_no
    FROM stock_out_items soi
    JOIN items i ON i.id = soi.item_id
    JOIN stock_out so ON so.id = soi.stock_out_id
    WHERE i.tracking_type = 'TRACKED' AND so.destination_branch_id IS NOT NULL AND so.status = 'DIKIRIM'
    ORDER BY soi.id
  `);

    // ─── MATERIAL TRACKING ──────────────────
    console.log('Seeding material_tracking...');
    const cabangUserId = userMap['cabang1'] || 3;
    const spiUserId = userMap['spi'] || 4;

    const trackingInserts = [];
    for (const soi of soiRes.rows) {
        const slaStart = soi.released_at || new Date().toISOString();
        const slaDeadline = new Date(new Date(slaStart).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days SLA

        // Decide status based on how old it is
        let status, receivedAt = null, installedAt = null, verifiedAt = null;
        const daysOld = Math.floor((Date.now() - new Date(slaStart).getTime()) / (1000 * 60 * 60 * 24));

        if (daysOld > 18) {
            status = 'TERVERIFIKASI';
            receivedAt = new Date(new Date(slaStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
            installedAt = new Date(new Date(slaStart).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
            verifiedAt = new Date(new Date(slaStart).getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();
        } else if (daysOld > 12) {
            status = 'MENUNGGU_VERIFIKASI';
            receivedAt = new Date(new Date(slaStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
            installedAt = new Date(new Date(slaStart).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
        } else if (daysOld > 8) {
            status = 'TERPASANG';
            receivedAt = new Date(new Date(slaStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
            installedAt = new Date(new Date(slaStart).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
        } else if (daysOld > 5) {
            status = 'DITERIMA_CABANG';
            receivedAt = new Date(new Date(slaStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
        } else {
            status = 'MENUNGGU_DITERIMA';
        }

        const res = await client.query(`
      INSERT INTO material_tracking (transaction_item_id, branch_id, status, sla_start_at, sla_deadline_at,
        received_at, received_by, installed_at, installed_by, verified_at, verified_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
            soi.id, soi.destination_branch_id, status, slaStart, slaDeadline,
            receivedAt, receivedAt ? cabangUserId : null,
            installedAt, installedAt ? cabangUserId : null,
            verifiedAt, verifiedAt ? spiUserId : null,
        ]);
        trackingInserts.push({ ...res.rows[0], status, branchId: soi.destination_branch_id, itemCode: soi.item_code, qty: soi.quantity });
    }

    // ─── INSTALLATION ALLOCATIONS & EVIDENCE ──────────────────
    console.log('Seeding installation_allocations and evidence...');

    // Lombok area coordinates for realistic GIS data
    const gpsPoints = [
        { lat: -8.5750, lon: 116.0810, name: 'Ampenan Utara' },
        { lat: -8.5820, lon: 116.0780, name: 'Ampenan Selatan' },
        { lat: -8.5830, lon: 116.1320, name: 'Cakranegara Barat' },
        { lat: -8.5850, lon: 116.1380, name: 'Cakranegara Timur' },
        { lat: -8.5900, lon: 116.1050, name: 'Mataram Kota' },
        { lat: -8.5950, lon: 116.1100, name: 'Mataram Barat' },
        { lat: -8.6000, lon: 116.1500, name: 'Sandubaya' },
        { lat: -8.6050, lon: 116.1550, name: 'Sandubaya Timur' },
        { lat: -8.6100, lon: 116.0900, name: 'Sekarbela' },
        { lat: -8.5600, lon: 116.0720, name: 'Gunungsari' },
    ];

    let gpsIdx = 0;
    for (const track of trackingInserts) {
        if (['TERPASANG', 'MENUNGGU_VERIFIKASI', 'TERVERIFIKASI'].includes(track.status)) {
            const gps = gpsPoints[gpsIdx % gpsPoints.length];
            gpsIdx++;

            // Create allocation
            const allocRes = await client.query(`
        INSERT INTO installation_allocations (tracking_id, quantity, planned_latitude, planned_longitude, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [track.id, track.qty, gps.lat.toFixed(7), gps.lon.toFixed(7),
            track.status === 'TERVERIFIKASI' ? 'VERIFIED' : track.status === 'MENUNGGU_VERIFIKASI' ? 'INSTALLED' : 'INSTALLED',
                cabangUserId]);

            const allocId = allocRes.rows[0].id;

            // Create evidence for verified & waiting_verification
            if (['MENUNGGU_VERIFIKASI', 'TERVERIFIKASI'].includes(track.status)) {
                // Slight offset from planned location for some entries to show mismatch
                const isMismatch = gpsIdx % 4 === 0;
                const actualLat = isMismatch ? gps.lat + 0.005 : gps.lat + 0.0001;
                const actualLon = isMismatch ? gps.lon + 0.004 : gps.lon + 0.0001;
                const deviation = isMismatch ? 640 : 12;

                await client.query(`
          INSERT INTO installation_evidence (allocation_id, tracking_id, attempt_number, 
            photo_url, original_photo_url, photo_checksum,
            latitude, longitude, gps_accuracy,
            captured_by, branch_id, status, 
            location_mismatch, location_deviation_meters, mismatch_threshold_meters)
          VALUES ($1, $2, 1, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
                    allocId, track.id,
                    `https://placehold.co/800x600/2d5016/white?text=Evidence+${track.itemCode}`,
                    `sha256-dummy-${Date.now()}-${gpsIdx}`,
                    actualLat.toFixed(7), actualLon.toFixed(7), '8.50',
                    cabangUserId, track.branchId,
                    track.status === 'TERVERIFIKASI' ? 'TERVERIFIKASI' : 'PENDING',
                    isMismatch, deviation.toString(), '100',
                ]);
            }
        }
    }

    // ─── AUDIT LOGS ──────────────────
    console.log('Seeding audit_logs...');
    const auditData = [
        ['stock_in', 'CREATE', 'Barang masuk BM-20260801-0001 diterima', gudangId, 'gudang1', d(25)],
        ['stock_in', 'CREATE', 'Barang masuk BM-20260805-0002 diterima', gudangId, 'gudang1', d(21)],
        ['stock_out', 'CREATE', 'Barang keluar BK-20260803-0001 dibuat', gudangId, 'gudang1', d(23)],
        ['stock_out', 'UPDATE', 'Barang keluar BK-20260803-0001 disetujui', adminId, 'admin', d(23)],
        ['stock_out', 'CREATE', 'Barang keluar BK-20260807-0002 dibuat', gudangId, 'gudang1', d(19)],
        ['material_tracking', 'UPDATE', 'Tracking MTR-001 status → DITERIMA_CABANG', cabangUserId, 'cabang1', d(20)],
        ['material_tracking', 'UPDATE', 'Tracking MTR-001 status → TERPASANG', cabangUserId, 'cabang1', d(17)],
        ['installation_evidence', 'CREATE', 'Evidence foto pemasangan diunggah', cabangUserId, 'cabang1', d(17)],
        ['material_tracking', 'UPDATE', 'Tracking MTR-001 → TERVERIFIKASI oleh SPI', spiUserId, 'spi', d(15)],
        ['stock_in', 'CREATE', 'Barang masuk BM-20260810-0003 diterima', gudangId, 'gudang1', d(16)],
        ['stock_out', 'CREATE', 'Barang keluar BK-20260812-0003 dibuat', gudangId, 'gudang1', d(14)],
        ['stock_out', 'UPDATE', 'Barang keluar BK-20260816-0004 disetujui', adminId, 'admin', d(10)],
        ['items', 'UPDATE', 'Stok Meter Air DN 15mm disesuaikan', gudangId, 'gudang1', d(8)],
        ['stock_out', 'CREATE', 'Barang keluar BK-20260818-0008 dibuat', gudangId, 'gudang1', d(8)],
        ['material_tracking', 'UPDATE', 'Tracking pergantian meter → DITERIMA_CABANG', cabangUserId, 'cabang1', d(6)],
        ['users', 'UPDATE', 'Password user cabang1 direset', adminId, 'admin', d(3)],
        ['stock_in', 'CREATE', 'Barang masuk BM-20260825-0006 draft', gudangId, 'gudang1', d(2)],
        ['stock_out', 'CREATE', 'Barang keluar BK-20260824-0006 draft', gudangId, 'gudang1', d(2)],
    ];
    for (const [entity, action, desc, userId, username, ts] of auditData) {
        await client.query(`
      INSERT INTO audit_logs (entity_type, action, description, user_id, username, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [entity, action, desc, userId, username, ts]);
    }

    // ─── SUMMARY ──────────────────
    console.log('\n=== SEED COMPLETE ===');
    const counts = await client.query(`
    SELECT 
      (SELECT count(*) FROM categories) as categories,
      (SELECT count(*) FROM units) as units,
      (SELECT count(*) FROM suppliers) as suppliers,
      (SELECT count(*) FROM departments) as departments,
      (SELECT count(*) FROM warehouses) as warehouses,
      (SELECT count(*) FROM locations) as locations,
      (SELECT count(*) FROM branches) as branches,
      (SELECT count(*) FROM items) as items,
      (SELECT count(*) FROM stock_in) as stock_in,
      (SELECT count(*) FROM stock_in_items) as stock_in_items,
      (SELECT count(*) FROM stock_out) as stock_out,
      (SELECT count(*) FROM stock_out_items) as stock_out_items,
      (SELECT count(*) FROM stock_balances) as stock_balances,
      (SELECT count(*) FROM material_tracking) as material_tracking,
      (SELECT count(*) FROM installation_allocations) as allocations,
      (SELECT count(*) FROM installation_evidence) as evidence,
      (SELECT count(*) FROM audit_logs) as audit_logs
  `);
    console.table(counts.rows[0]);

    await client.end();
    process.exit(0);
}

run().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
