/**
 * seed-movement-dates.js
 * Updates and inserts realistic stock_in and stock_out transactions across the last 30 days,
 * ensuring active data for both 7-day and 30-day dashboard charts.
 */
const { Client } = require('pg');

const conString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_v2u3wqXQinaH@ep-ancient-hall-azqpoba3-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

function d(daysAgo, hour = 9) {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(hour, 0, 0, 0);
  return dt.toISOString();
}

async function run() {
  const client = new Client({ connectionString: conString });
  await client.connect();
  console.log('Connected to Neon PostgreSQL.');

  const whRes = await client.query('SELECT id FROM warehouses LIMIT 1');
  const deptRes = await client.query('SELECT id FROM departments LIMIT 1');
  const brRes = await client.query('SELECT id FROM branches LIMIT 1');
  const supRes = await client.query('SELECT id FROM suppliers LIMIT 1');
  const usrRes = await client.query('SELECT id FROM users LIMIT 1');
  const itemsRes = await client.query('SELECT id FROM items LIMIT 10');

  const whId = whRes.rows[0]?.id || 1;
  const deptId = deptRes.rows[0]?.id || 1;
  const brId = brRes.rows[0]?.id || 1;
  const supId = supRes.rows[0]?.id || 1;
  const usrId = usrRes.rows[0]?.id || 1;
  const itemIds = itemsRes.rows.map(r => r.id);

  console.log('Using foreign keys:', { whId, deptId, brId, supId, usrId, itemIdsCount: itemIds.length });

  // 1. First, update existing stock_in and stock_out to fall into the last 7-14 days
  console.log('Updating existing stock_in dates...');
  const existingStockIn = await client.query('SELECT id FROM stock_in ORDER BY id ASC');
  const inDayOffsets = [0, 1, 2, 3, 4, 5, 8, 12, 16, 22];
  for (let i = 0; i < existingStockIn.rows.length; i++) {
    const rowId = existingStockIn.rows[i].id;
    const daysAgo = inDayOffsets[i % inDayOffsets.length];
    const txDate = d(daysAgo, 8 + (i % 8));
    await client.query(
      `UPDATE stock_in SET transaction_date = $1, status = 'completed', updated_at = $1 WHERE id = $2`,
      [txDate, rowId]
    );
  }

  console.log('Updating existing stock_out dates...');
  const existingStockOut = await client.query('SELECT id FROM stock_out ORDER BY id ASC');
  const outDayOffsets = [0, 1, 2, 3, 4, 5, 6, 9, 14, 20];
  for (let i = 0; i < existingStockOut.rows.length; i++) {
    const rowId = existingStockOut.rows[i].id;
    const daysAgo = outDayOffsets[i % outDayOffsets.length];
    const txDate = d(daysAgo, 10 + (i % 6));
    await client.query(
      `UPDATE stock_out SET transaction_date = $1, released_at = $1, status = 'DIKIRIM', updated_at = $1 WHERE id = $2`,
      [txDate, rowId]
    );
  }

  // 2. Generate daily transactions for the last 30 days to make the chart lively and realistic
  console.log('Ensuring rich 30-day stock movement...');
  // Define distribution for days 0 to 29
  // [daysAgo, stockInCount, stockOutCount]
  const movementPlan = [
    [0, 2, 1],
    [1, 1, 2],
    [2, 3, 2],
    [3, 2, 3],
    [4, 1, 2],
    [5, 2, 1],
    [6, 3, 2],
    [7, 2, 1],
    [8, 1, 2],
    [9, 2, 3],
    [10, 1, 1],
    [11, 3, 2],
    [12, 2, 2],
    [13, 1, 3],
    [14, 2, 1],
    [15, 3, 2],
    [16, 2, 1],
    [17, 1, 2],
    [18, 2, 3],
    [19, 3, 1],
    [20, 2, 2],
    [21, 1, 2],
    [22, 2, 1],
    [23, 3, 2],
    [24, 1, 3],
    [25, 2, 1],
    [26, 2, 2],
    [27, 3, 1],
    [28, 1, 2],
    [29, 2, 1],
  ];

  for (const [daysAgo, inCount, outCount] of movementPlan) {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);
    const ymd = dt.toISOString().split('T')[0].replace(/-/g, '');

    // Insert Stock In if not exists
    for (let c = 1; c <= inCount; c++) {
      const refNo = `BM-${ymd}-00${c}`;
      const txDate = d(daysAgo, 8 + c * 2);
      const res = await client.query(
        `INSERT INTO stock_in (reference_no, supplier_id, warehouse_id, status, notes, created_by, transaction_date, created_at, updated_at)
         VALUES ($1, $2, $3, 'completed', $4, $5, $6, $6, $6)
         ON CONFLICT (reference_no) DO UPDATE SET transaction_date = $6, status = 'completed', updated_at = $6
         RETURNING id`,
        [refNo, supId, whId, `Penerimaan Material H-${daysAgo}`, usrId, txDate]
      );

      const stockInId = res.rows[0]?.id;
      if (stockInId && itemIds.length > 0) {
        const itemId = itemIds[(daysAgo + c) % itemIds.length];
        await client.query(
          `INSERT INTO stock_in_items (stock_in_id, item_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [stockInId, itemId, 10 + c * 5, 25000]
        );
      }
    }

    // Insert Stock Out if not exists
    for (let c = 1; c <= outCount; c++) {
      const refNo = `BK-${ymd}-00${c}`;
      const txDate = d(daysAgo, 9 + c * 2);
      const res = await client.query(
        `INSERT INTO stock_out (reference_no, department_id, warehouse_id, destination_branch_id, status, approval_status, released_at, notes, created_by, transaction_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'DIKIRIM', 'approved', $5, $6, $7, $5, $5, $5)
         ON CONFLICT (reference_no) DO UPDATE SET transaction_date = $5, released_at = $5, status = 'DIKIRIM', updated_at = $5
         RETURNING id`,
        [refNo, deptId, whId, brId, txDate, `Distribusi Cabang H-${daysAgo}`, usrId]
      );

      const stockOutId = res.rows[0]?.id;
      if (stockOutId && itemIds.length > 0) {
        const itemId = itemIds[(daysAgo + c + 2) % itemIds.length];
        await client.query(
          `INSERT INTO stock_out_items (stock_out_id, item_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [stockOutId, itemId, 5 + c * 2]
        );
      }
    }
  }

  console.log('Successfully seeded active stock movement for last 30 days and 7 days!');
  await client.end();
}

run().catch(err => {
  console.error('Error seeding stock movement:', err);
  process.exit(1);
});
