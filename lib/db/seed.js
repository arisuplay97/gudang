const { Client } = require('pg');
const bcrypt = require('C:/laragon/www/sigaplek/node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs');

const conString = 'postgresql://neondb_owner:npg_v2u3wqXQinaH@ep-ancient-hall-azqpoba3-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function run() {
    const client = new Client({ connectionString: conString });
    await client.connect();

    console.log('Connected. Generating real bcrypt hash...');
    const hash = await bcrypt.hash('password', 10);
    console.log('Hash generated:', hash);

    const users = [
        { u: 'admin', f: 'Administrator', r: 'ADMIN' },
        { u: 'gudang1', f: 'Petugas Gudang', r: 'GUDANG' },
        { u: 'cabang1', f: 'Petugas Cabang', r: 'CABANG' },
        { u: 'spi', f: 'Auditor SPI', r: 'SPI' }
    ];

    for (const user of users) {
        console.log(`Upserting ${user.u}...`);
        await client.query(`
      INSERT INTO users (username, full_name, role, password_hash, is_active, status) 
      VALUES ($1, $2, $3, $4, true, 'active')
      ON CONFLICT (username) DO UPDATE SET password_hash = $4
    `, [user.u, user.f, user.r, hash]);
    }

    // Verify
    const res = await client.query('SELECT id, username, role, substring(password_hash, 1, 20) as hash_prefix FROM users');
    console.log('Users in DB:', res.rows);

    // Quick verify the hash works
    const ok = await bcrypt.compare('password', hash);
    console.log('Hash verification (password vs hash):', ok);

    console.log('Seed completed!');
    await client.end();
    process.exit(0);
}

run().catch(console.error);
