const Room = require('../models/Room');
const crypto = require('crypto');

exports.createRoom = async (req, res) => {
  try {
    const roomId = crypto.randomBytes(3).toString('hex'); // 6-character ID
    const passkey = req.body.passkey || crypto.randomBytes(4).toString('hex').slice(0, 6); 
    const creatorSessionId = crypto.randomBytes(16).toString('hex'); // Cryptographic admin session

    const room = new Room({
      roomId,
      passkey, 
      creatorSessionId
    });

    await room.save();
    
    // Pass creatorSessionId back elegantly alongside standard details
    res.status(201).json({ roomId, passkey, creatorSessionId });
  } catch (err) {
    console.error('Room Creation Error:', err);
    res.status(500).json({ 
      error: 'Failed to create room', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
};

exports.verifyPasskey = async (req, res) => {
  try {
    const { roomId, passkey, creatorSessionId } = req.body;
    
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found or has expired' });
    }

    if (room.passkey !== passkey) {
      return res.status(401).json({ error: 'Invalid passkey' });
    }

    // Securely validate locked rooms immediately rejecting interlopers
    if (room.isLocked) {
      if (!creatorSessionId || room.creatorSessionId !== creatorSessionId) {
        return res.status(403).json({ error: 'This room has been securely locked by the creator.' });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify passkey' });
  }
};
