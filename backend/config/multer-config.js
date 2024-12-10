// backend/config/multer-config.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'g_cross_images',
        format: async (req, file) => file.mimetype.split('/')[1], 
        public_id: (req, file) => file.originalname.split('.')[0], 
    },
});

const upload = multer({ 
    storage: storage,
    limits: { files: 5 },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file), false);
        }
    }
}).array('imageUrls', 5); // Use 'imageUrls' to match the form field

module.exports = upload;
