const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.post('/', roomController.createRoom);
router.post('/verify', roomController.verifyPasskey);

module.exports = router;
