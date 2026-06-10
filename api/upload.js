const multer = require('multer');

// Store uploads in memory — no disk writes, no temp files
// Keeps things clean for a prototype and avoids file cleanup issues
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per label image
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
  }
});

module.exports = upload;