(async () => {
  const base = 'http://localhost:5000';
  try {
    // Login as HOD
    const loginRes = await fetch(base + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sunita.rao@bgi.edu.in', password: 'Hod@123' }),
    });
    const loginJson = await loginRes.json();
    if (!loginJson.success) { console.error('HOD login failed', loginJson); process.exit(1); }
    const token = loginJson.data.token;

    const leaveId = '6a480e4441b496ef0f1e7800';
    const approveRes = await fetch(base + `/api/v1/hod/requests/${leaveId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ remark: 'Approved in test' }),
    });
    const approveJson = await approveRes.json();
    console.log('APPROVE:', JSON.stringify(approveJson, null, 2));

    // Fetch updated request
    const reqRes = await fetch(base + `/api/v1/hod/requests/${leaveId}`, { headers: { Authorization: 'Bearer ' + token } });
    const reqJson = await reqRes.json();
    console.log('REQUEST:', JSON.stringify(reqJson, null, 2));

    // Fetch HOD notifications
    const notRes = await fetch(base + '/api/v1/notifications', { headers: { Authorization: 'Bearer ' + token } });
    const notJson = await notRes.json();
    console.log('HOD_NOTIFS:', JSON.stringify(notJson, null, 2));

    // Fetch student notifications
    const studentLogin = await fetch(base + '/api/v1/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'john.doe@bgi.edu.in', password: 'Student@123' }),
    });
    const studentJson = await studentLogin.json();
    const stToken = studentJson.data.token;
    const sNotRes = await fetch(base + '/api/v1/notifications', { headers: { Authorization: 'Bearer ' + stToken } });
    const sNotJson = await sNotRes.json();
    console.log('STUDENT_NOTIFS:', JSON.stringify(sNotJson, null, 2));

  } catch (err) { console.error('error', err); process.exit(1); }
})();
