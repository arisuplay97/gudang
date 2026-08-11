import { db } from "./src/index.js";
import { sql } from "drizzle-orm";

async function check() {
    try {
        const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
        console.log("TABLES:", res.rows.map(r => r.table_name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
