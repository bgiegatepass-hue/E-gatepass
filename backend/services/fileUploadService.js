const { getBucket } = require('../config/firebase');
const cloudinary = require('../config/cloudinary');

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

/**
 * Uploads an in-memory buffer (from multer's memoryStorage) to Cloudinary
 * and returns a public secure URL. If Cloudinary is misconfigured, the call
 * throws a clear error unless the fallback flag is explicitly enabled.
 */
async function uploadBufferToCloudinary(buffer, destPath, folder = 'epass', contentType = 'image/jpeg') {
  if (!isCloudinaryConfigured()) {
    if (process.env.CLOUDINARY_FALLBACK_TO_BASE64 === 'true') {
      console.warn('Cloudinary not configured — returning a local data URL because fallback is enabled.');
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    }
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET in .env.');
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, public_id: destPath, resource_type: 'image', overwrite: true },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
      stream.end(buffer);
    });
    return result.secure_url;
  } catch (err) {
    if (process.env.CLOUDINARY_FALLBACK_TO_BASE64 === 'true') {
      console.warn('Cloudinary upload failed, falling back to a local data URL:', err.message);
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    }
    throw new Error(`Cloudinary upload failed: ${err.message}`);
  }
}

/**
 * Uploads an in-memory buffer (from multer's memoryStorage) to Firebase Storage
 * and returns a public URL. If Firebase isn't configured yet (no service account
 * in .env), falls back to a base64 data URL so the app still works for local dev
 * — swap in real Firebase credentials before going to production.
 */
async function uploadBufferToFirebase(buffer, destPath, contentType) {
  const bucket = getBucket();

  if (!bucket) {
    console.warn('Firebase Storage not configured — returning a local base64 data URL instead.');
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }

  const file = bucket.file(destPath);
  await file.save(buffer, { metadata: { contentType }, public: true });
  return `https://storage.googleapis.com/${bucket.name}/${destPath}`;
}

module.exports = { uploadBufferToFirebase, uploadBufferToCloudinary };