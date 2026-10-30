const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  }
});

// Strict File Filter: Only genuine raster images allowed (SVG strictly disallowed to prevent Stored XSS)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Security Error: Only image files (JPEG, PNG, WEBP) are allowed. SVG and executable formats are strictly blocked.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB maximum limit to prevent disk exhaustion
});

// @desc    Upload an image (Admin only)
// @route   POST /api/upload
// @access  Private (Admin only)
router.post('/', verifyToken, authorizeRoles('admin'), (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const relativeUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully!',
      data: {
        filename: req.file.filename,
        url: fullUrl,
        relativeUrl: relativeUrl
      }
    });
  });
});

// @desc    Upload multiple images (up to 8 images at once for Flipkart/Amazon style galleries)
// @route   POST /api/upload/multiple
// @access  Private (Admin only)
router.post('/multiple', verifyToken, authorizeRoles('admin'), (req, res) => {
  upload.array('images', 8)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files uploaded.'
      });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const uploadedImages = req.files.map((file) => {
      const relativeUrl = `/uploads/${file.filename}`;
      return {
        filename: file.filename,
        relativeUrl,
        url: `${protocol}://${host}${relativeUrl}`
      };
    });

    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} images uploaded successfully!`,
      data: uploadedImages
    });
  });
});

// @desc    Upload customer review photo (Authenticated customers & admin)
// @route   POST /api/upload/review-image
// @access  Private (Authenticated users)
router.post('/review-image', verifyToken, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.'
      });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const relativeUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    res.status(200).json({
      success: true,
      message: 'Review photo uploaded successfully!',
      data: {
        filename: req.file.filename,
        url: fullUrl,
        relativeUrl: relativeUrl
      }
    });
  });
});

module.exports = router;
