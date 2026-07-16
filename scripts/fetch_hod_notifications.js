(async () => {
  const base = 'http://localhost:5000';
  try {
    const loginRes = await fetch(base + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sunita.rao@bgi.edu.in', password: 'Hod@123' }),
    });
    const loginJson = await loginRes.json();
    if (!loginJson.success) { console.error('HOD login failed', loginJson); process.exit(1); }
    const token = loginJson.data.token;
    const notRes = await fetch(base + '/api/v1/notifications', { headers: { Authorization: 'Bearer ' + token } });
    const notJson = await notRes.json();
    console.log('HOD notifications:', JSON.stringify(notJson, null, 2));
  } catch (err) { console.error('error', err); process.exit(1); }
})();
