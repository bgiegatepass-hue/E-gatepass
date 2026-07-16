require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

async function cleanup() {
  await connectDB();
  const emails = [
    'admin.bist@bgi.edu.in',
    'admin.birt@bgi.edu.in',
    'admin.birts@bgi.edu.in',
    'sunita.rao@bgi.edu.in',
    'ramesh.kumar@bgi.edu.in',
    'john.doe@bgi.edu.in',
    'alice.smith@bgi.edu.in',
    'guard.gate1@bgi.edu.in'
  ];
  try {
    const res = await User.deleteMany({ email: { $in: emails } });
    console.log('Deleted count:', res.deletedCount);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
  process.exit(0);
}

cleanup();
