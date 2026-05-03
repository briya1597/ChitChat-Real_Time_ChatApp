const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const roomId = req.headers['x-room-id'] || req.params.roomId;
    if (!roomId) return cb(new Error('Room ID is missing in headers or params'));
    
    const roomDir = path.join(__dirname, '..', 'uploads', roomId);
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir, { recursive: true });
    }
    cb(null, roomDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB

router.post('/', roomController.createRoom);
router.post('/verify', roomController.verifyPasskey);

router.post('/:roomId/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.params.roomId}/${req.file.filename}`;
  res.status(200).json({ fileUrl, fileType: req.file.mimetype });
});

module.exports = router;
