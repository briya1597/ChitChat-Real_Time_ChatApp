const Room = require('../models/Room');
const crypto = require('crypto');

exports.createRoom = async (req, res) => {
  try {
    const { passkey } = req.body;
    if (!passkey) {
      return res.status(400).json({ error: 'Passkey is required' });
    }

    const roomId = crypto.randomBytes(3).toString('hex');
    
    const room = new Room({
      roomId,
      passkey, 
    });

    await room.save();
    res.status(201).json({ roomId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room' });
  }
};

exports.verifyPasskey = async (req, res) => {
  try {
    const { roomId, passkey } = req.body;
    
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found or has expired' });
    }

    if (room.passkey !== passkey) {
      return res.status(401).json({ error: 'Invalid passkey' });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify passkey' });
  }
};
