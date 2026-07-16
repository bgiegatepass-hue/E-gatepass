const test = require('node:test');
const assert = require('node:assert/strict');
const { uploadBufferToCloudinary } = require('../services/fileUploadService');

test('throws a clear error when Cloudinary is not configured', async () => {
  const prev = {
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_FALLBACK_TO_BASE64: process.env.CLOUDINARY_FALLBACK_TO_BASE64,
  };

  delete process.env.CLOUDINARY_URL;
  process.env.CLOUDINARY_CLOUD_NAME = '';
  process.env.CLOUDINARY_API_KEY = '';
  process.env.CLOUDINARY_API_SECRET = '';
  delete process.env.CLOUDINARY_FALLBACK_TO_BASE64;

  try {
    await assert.rejects(
      () => uploadBufferToCloudinary(Buffer.from('hello'), 'profile-test', 'epass', 'image/png'),
      /Cloudinary is not configured/
    );
  } finally {
    Object.entries(prev).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});
