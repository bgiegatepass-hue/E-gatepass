const { initFirebase, getBucket } = require('../config/firebase');

(async () => {
  try {
    initFirebase();
    const bucket = getBucket();
    if (!bucket) {
      console.error('Firebase not initialized or bucket not configured');
      process.exit(2);
    }

    const [exists] = await bucket.exists();
    if (exists) {
      console.log('OK: Bucket exists:', bucket.name || process.env.FIREBASE_STORAGE_BUCKET);
      process.exit(0);
    }
    console.error('ERROR: Bucket does not exist:', bucket.name || process.env.FIREBASE_STORAGE_BUCKET);
    process.exit(3);
  } catch (err) {
    console.error('ERROR:', err.message || err);
    process.exit(4);
  }
})();
