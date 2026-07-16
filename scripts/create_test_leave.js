(async () => {
  const base = 'http://localhost:5000';
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // wait until health endpoint is ready
  for (let i = 0; i < 20; i++) {
    try {
      const h = await fetch(base + '/api/v1/health');
      if (h.ok) break;
    } catch (e) {}
    await wait(500);
  }

  try {
    const loginRes = await fetch(base + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john.doe@bgi.edu.in', password: 'Student@123' }),
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN:', JSON.stringify(loginJson, null, 2));
    if (!loginJson.success) {
      console.error('Login failed');
      process.exit(1);
    }
    const token = loginJson.data.token;

    const leavePayload = {
      leaveType: 'Personal',
      leaveDate: new Date().toISOString().slice(0, 10),
      purpose: 'Test leave from script',
      reason: 'Testing HOD routing',
      tgName: 'Test TG'
    };

    const leaveRes = await fetch(base + '/api/v1/leave/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(leavePayload),
    });
    const leaveJson = await leaveRes.json();
    console.log('APPLY:', JSON.stringify(leaveJson, null, 2));
  } catch (err) {
    console.error('Error in test script:', err);
    process.exit(1);
  }
})();
