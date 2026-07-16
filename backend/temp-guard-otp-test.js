const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const PendingRegistration = require('./models/PendingRegistration');
const { verifyOtp } = require('./controllers/registerController');

async function main() {
  await connectDB();

  const testEmail = 'guardtestotp@example.com';
  await User.deleteOne({ email: testEmail });
  await PendingRegistration.deleteOne({ email: testEmail });

  const pending = await PendingRegistration.create({
    name: 'Test Guard',
    email: testEmail,
    passwordHash: '$2a$10$5o4ZrJzOpAe4PTC8e9N3aO9H0nMYPI7tWAb/MIvMvtpK4BReSG2Um',
    campus: 'BIRT',
    role: 'GUARD',
    employeeId: 'G123',
    assignedGate: 'Main Gate',
    college: 'BIRT',
    phone: '9999999999',
    otp: '123456',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      console.log('RESPONSE:', { statusCode: this.statusCode, payload });
      return this;
    },
  };

  const req = {
    body: { email: testEmail, otp: '123456' },
    ip: '127.0.0.1',
  };

  const next = (err) => {
    console.error('NEXT callback called:', err);
  };

  console.log('DEBUG: verifyOtp is', typeof verifyOtp);
  console.log('DEBUG: pending document exists:', !!pending, pending ? pending.toObject() : null);
  await verifyOtp(req, res, next);
  console.log('DEBUG: verifyOtp finished', { statusCode: res.statusCode, payload: res.payload });

  const user = await User.findOne({ email: testEmail }).lean();
  console.log('CREATED USER:', user ? {
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    assignedGate: user.assignedGate,
    employeeId: user.employeeId,
    rollNumber: user.rollNumber,
  } : null);

  await new Promise((resolve) => setTimeout(resolve, 500));

  await PendingRegistration.deleteOne({ email: testEmail });
  await User.deleteOne({ email: testEmail });
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});