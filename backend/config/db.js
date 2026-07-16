const mongoose = require('mongoose');
const dns = require('dns');

// Fixes a very common Windows issue where mongodb+srv:// connections fail with
// "querySrv ECONNREFUSED" — some Windows networks/DNS resolvers don't handle
// SRV record lookups correctly when Node prefers IPv6 first. Forcing IPv4-first
// resolution avoids that entirely.
dns.setDefaultResultOrder('ipv4first');

let memoryMongoServer = null;

async function connectDB() {
  const atlasUri = process.env.MONGODB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/epass_db';
  
  console.log('DEBUG: process.cwd():', process.cwd());
  console.log('DEBUG: process.env.MONGODB_URI:', atlasUri);
  console.log('DEBUG: Keys with "MONGO":', Object.keys(process.env).filter(k => k.includes('MONGO')));
  
  // Try Atlas first if configured, then local, then in-memory
  const candidateUris = atlasUri && atlasUri.includes('cluster0') 
    ? [atlasUri, localUri]
    : [localUri, atlasUri].filter(Boolean);
  
  const options = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 15000,
    family: 4,
  };

  let lastErr = null;

  for (const uri of candidateUris) {
    try {
      console.log(`🔵 [DB] Attempting connection to: ${uri.replace(/:[^@]*@/, ':****@')}`);
      await mongoose.connect(uri, options);
      console.log('✅ [DB] MongoDB connected:', mongoose.connection.name);
      console.log('   Database:', mongoose.connection.db?.databaseName);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`⚠️  [DB] Connection failed:`, err.message);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');

      if (!memoryMongoServer) {
        console.log('🟡 [DB] Falling back to in-memory MongoDB (MemoryServer)...');
        memoryMongoServer = await MongoMemoryServer.create({ instance: { dbName: 'epass_db' } });
      }

      await mongoose.connect(memoryMongoServer.getUri(), { dbName: 'epass_db', ...options });
      console.log('✅ [DB] MongoDB connected via in-memory server');
      return;
    } catch (memoryErr) {
      console.error('❌ [DB] FATAL: All MongoDB connections failed');
      console.error('   Atlas/Local error:', lastErr.message);
      console.error('   In-memory error:', memoryErr.message);
      process.exit(1);
    }
  }

  console.error('❌ [DB] FATAL: MongoDB connection failed in production');
  process.exit(1);
}

module.exports = connectDB;
