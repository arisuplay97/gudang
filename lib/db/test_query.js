const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_v2u3wqXQinaH@ep-ancient-hall-azqpoba3-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

client.connect().then(() => {
    return client.query('select * from users where username = $1', ['admin']);
}).then(res => {
    console.log('SUCCESS! Rows:', res.rows);
    process.exit(0);
}).catch(err => {
    console.error('FAILED!', err);
    process.exit(1);
});
