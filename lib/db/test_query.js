const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_v2u3wqXQinaH@ep-ancient-hall-azqpoba3-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

client.connect().then(() => {
    const query = `
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      ) WITH (OIDS=FALSE);
      
      ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
      ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `;
    return client.query(query);
}).then(res => {
    console.log('SUCCESS! Session table created.');
    process.exit(0);
}).catch(err => {
    console.error('FAILED!', err);
    process.exit(1);
});
