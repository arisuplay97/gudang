const url = 'https://gudang-git-main-alungseptian5-1346s-projects.vercel.app/api/auth/login';

fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: 'admin', password: 'password' })
}).then(r => r.text()).then(t => {
    console.log('RESPONSE:', t);
}).catch(console.error);
