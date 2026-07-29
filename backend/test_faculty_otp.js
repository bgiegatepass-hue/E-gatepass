const https = require('https');
const data = JSON.stringify({
  name: 'Test Faculty',
  email: 'testfaculty.example@gmail.com',
  password: 'Test@1234',
  department: 'CSE',
  designation: 'Professor',
  college: 'BIST',
  phone: '9876543210',
  campus: 'BIST',
  employeeId: 'FAC123',
});

const options = {
  hostname: 'e-gatepass-1-pbej.onrender.com',
  port: 443,
  path: '/api/v1/auth/faculty/register/send-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = https.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', res.headers);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('BODY', body);
  });
});

req.on('error', (e) => {
  console.error('REQUEST_ERROR', e.message);
});

req.write(data);
req.end();
