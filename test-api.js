const http = require('http');

const endpoints = [
    '/api/dashboard/summary',
    '/api/dashboard/recent-transactions',
    '/api/dashboard/low-stock',
    '/api/dashboard/stock-movement',
    '/api/dashboard/stock-health',
    '/api/dashboard/aging',
    '/api/dashboard/exceptions',
    '/api/dashboard/top-outgoing',
    '/api/dashboard/activity',
    '/api/notifications',
    '/api/gis/material-locations',
    '/api/search?q=meter',
];

// First login to get session cookie
const loginData = JSON.stringify({ username: 'admin', password: 'password' });

const loginReq = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length },
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', async () => {
        console.log(`LOGIN: ${res.statusCode} → ${body.substring(0, 100)}`);

        // Get session cookie
        const cookies = res.headers['set-cookie'];
        const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
        console.log(`COOKIE: ${cookieStr.substring(0, 80)}...\n`);

        if (res.statusCode !== 200) {
            console.log('Login failed! Cannot test endpoints.');
            process.exit(1);
        }

        // Test each endpoint
        let passed = 0, failed = 0;
        for (const ep of endpoints) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const req = http.request({
                        hostname: 'localhost',
                        port: 3001,
                        path: ep,
                        method: 'GET',
                        headers: { 'Cookie': cookieStr },
                    }, (r) => {
                        let d = '';
                        r.on('data', chunk => d += chunk);
                        r.on('end', () => resolve({ status: r.statusCode, body: d }));
                    });
                    req.on('error', reject);
                    req.end();
                });

                const preview = result.body.substring(0, 120).replace(/\n/g, ' ');
                const ok = result.status === 200;
                console.log(`${ok ? '✅' : '❌'} ${ep} → ${result.status} | ${preview}`);
                if (ok) passed++; else failed++;
            } catch (err) {
                console.log(`❌ ${ep} → ERROR: ${err.message}`);
                failed++;
            }
        }

        console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed out of ${endpoints.length} ===`);
        process.exit(failed > 0 ? 1 : 0);
    });
});

loginReq.on('error', (err) => {
    console.error('Login request failed:', err.message);
    process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
