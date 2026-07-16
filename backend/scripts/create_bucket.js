const { Storage } = require('@google-cloud/storage');
const path = require('path');
require('dotenv').config();

(async () => {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || './firebase-service-account.json';
    const resolvedPath = path.isAbsolute(serviceAccountPath) ? serviceAccountPath : path.resolve(__dirname, '..', serviceAccountPath);
    const serviceAccount = require(resolvedPath);
    const projectId = serviceAccount.project_id;
    const credentials = { client_email: serviceAccount.client_email, private_key: serviceAccount.private_key };

    const storage = new Storage({ projectId, credentials });
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

    console.log('Attempting to create bucket:', bucketName, 'in project:', projectId);
    const [bucket] = await storage.createBucket(bucketName, {
      location: 'ASIA-SOUTH1',
      storageClass: 'STANDARD',
    });
    console.log('Bucket created:', bucket.name);
  } catch (err) {
    console.error('Create bucket failed:', err.message || err);
    process.exit(1);
  }
})();
