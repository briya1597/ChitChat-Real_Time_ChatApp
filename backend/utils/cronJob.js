const cron = require('node-cron');
const Room = require('../models/Room');
const Message = require('../models/Message');

const startCleanupJob = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      // Find rooms where expiresAt is populated and less than now
      const expiredRooms = await Room.find({
        expiresAt: { $ne: null, $lt: now }
      });

      for (const room of expiredRooms) {
        // Purge messages and folder payloads permanently
        await Message.deleteMany({ roomId: room.roomId });
        await Room.deleteOne({ _id: room._id });
        
        // Remove uploaded files statically to conserve OS node cache limitations asynchronously
        const uploadDir = path.join(__dirname, '..', 'uploads', room.roomId);
        if (fs.existsSync(uploadDir)) {
          fs.rmSync(uploadDir, { recursive: true, force: true });
        }
        console.log(`Cleaned up expired room: ${room.roomId}`);
      }
    } catch (err) {
      console.error('Error in cleanup job:', err);
    }
  });

  // Also clean up unconditionally abandoned rooms (e.g. rooms created 1 hour ago but never joined)
  cron.schedule('0 * * * *', async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const abandonedRooms = await Room.find({
        createdAt: { $lt: oneHourAgo },
        occupancyCount: 0,
        expiresAt: null
      });

      for (const room of abandonedRooms) {
        await Message.deleteMany({ roomId: room.roomId });
        await Room.deleteOne({ _id: room._id });
        console.log(`Cleaned up abandoned room: ${room.roomId}`);
      }
    } catch (err) {
      console.error('Error in abandoned cleanup job:', err);
    }
  });
};

module.exports = startCleanupJob;
