const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const cloudinaryConfig = process.env.CLOUDINARY_URL
  ? { cloudinary_url: process.env.CLOUDINARY_URL }
  : {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    };

cloudinary.config(cloudinaryConfig);

module.exports = cloudinary;