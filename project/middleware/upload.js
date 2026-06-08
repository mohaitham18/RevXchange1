const cloudinary = require('cloudinary');
const cloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const documentTypes = ['application/pdf', ...imageTypes];

const storage = cloudinaryStorage({
  cloudinary,

  params: (req, file, cb) => {
    const isHistoryDocument = file.fieldname === 'historyDocuments';
    const isPdf = file.mimetype === 'application/pdf';

    const params = {
      folder: isHistoryDocument ? 'revxchange/history-documents' : 'revxchange/cars',
      resource_type: isPdf ? 'raw' : 'image',
      allowed_formats: isHistoryDocument
        ? ['jpg', 'jpeg', 'png', 'webp', 'pdf']
        : ['jpg', 'jpeg', 'png', 'webp']
    };

    if (!isPdf) {
      params.transformation = [
        { width: 1200, height: 800, crop: 'limit', quality: 'auto' }
      ];
    }

    cb(null, params);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 25
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'images') {
      if (imageTypes.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Car images must be JPG, PNG, or WEBP.'));
    }

    if (file.fieldname === 'historyDocuments') {
      if (documentTypes.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('History documents must be PDF, JPG, PNG, or WEBP.'));
    }

    return cb(new Error('Unexpected file field.'));
  }
});

module.exports = upload;
