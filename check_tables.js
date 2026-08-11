require("dotenv").config({ path: "artifacts/api-server/.env" });
const { drizzle } = require("drizzle-orm/neon-http");
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function main() {
    try {
        const categories = await sql`SELECT * FROM categories`;
        const units = await sql`SELECT * FROM units`;
        const suppliers = await sql`SELECT * FROM suppliers`;

        console.log("Categories:", categories.length);
        console.log("Units:", units.length);
        console.log("Suppliers:", suppliers.length);
    } catch (err) {
        console.error(err);
    }
}

main();
