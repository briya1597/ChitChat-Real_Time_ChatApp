const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const roomRoutes = require('./routes/roomRoutes');
const startCleanupJob = require('./utils/cronJob');
const Room = require('./models/Room');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Dynamic CORS configuration allowing production frontend and local development
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(cors({
  origin: corsOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-room-id"],
  credentials: true
}));

app.use(express.json());

// Expose the temporary uploads directory statically to serve rich media natively
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["x-room-id"],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    startCleanupJob(); // Start cron jobs after DB connection
  })
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/rooms', roomRoutes);

// Socket.io logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', async ({ roomId, userName, creatorSessionId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) return;

      // Double-enforce lock at socket level to prevent unauthorized entry
      if (room.isLocked) {
        if (!creatorSessionId || room.creatorSessionId !== creatorSessionId) {
          socket.emit('error', 'This room is locked and no longer accepting new members.');
          socket.disconnect(true);
          return;
        }
      }

      socket.join(roomId);
      socket.roomId = roomId;
      socket.userName = userName;

      // Atomic increment and clear expiration to perfectly handle React Strict Mode race conditions
      const updatedRoom = await Room.findOneAndUpdate(
        { roomId },
        { $inc: { occupancyCount: 1 }, $set: { expiresAt: null } },
        { new: true }
      );
      
      if (updatedRoom) {
        const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
        socket.emit('room_history', messages);

        // Natively sync locking parameters directly to incoming user UI
        socket.emit('room_lock_status', updatedRoom.isLocked);

        // Broadcast updated user list to everyone in the room
        const roomSockets = await io.in(roomId).fetchSockets();
        const users = roomSockets.map(s => ({
          socketId: s.id,
          userName: s.userName
        }));
        io.to(roomId).emit('update_user_list', users);

        // Notify others via system message
        socket.to(roomId).emit('user_joined', { userName, timestamp: new Date() });
      }
    } catch (err) {
      console.error('Error joining room:', err);
    }
  });

  socket.on('kick_user', async ({ roomId, socketIdToKick, creatorSessionId }) => {
    try {
      const room = await Room.findOne({ roomId, creatorSessionId });
      if (room) {
        // Find the specific socket and emit kicked event
        const targetSocket = io.sockets.sockets.get(socketIdToKick);
        if (targetSocket) {
          io.to(socketIdToKick).emit('kicked');
          targetSocket.disconnect(true);
        }
      }
    } catch (err) {
      console.error('Error kicking user:', err);
    }
  });

  socket.on('toggle_lock', async ({ roomId, creatorSessionId }) => {
    try {
      // Exclusively grant modifications strictly matching the creator's session
      const room = await Room.findOne({ roomId, creatorSessionId });
      if (room) {
        room.isLocked = !room.isLocked;
        await room.save();
        io.to(roomId).emit('room_lock_status', room.isLocked);
      }
    } catch (err) {
      console.error('Error toggling room lock:', err);
    }
  });

  socket.on('send_message', async (data) => {
    const { roomId, senderName, text, fileUrl, fileType } = data;
    try {
      const message = new Message({ roomId, senderName, text, fileUrl, fileType });
      await message.save();

      io.to(roomId).emit('receive_message', message);

      // Avoid triggering AI if it's purely a file attachment
      if (!text) return;

      // Check if message summons Meta AI
      if (text.trim().toLowerCase().startsWith('@ai')) {
        const prompt = text.replace(/@ai/i, '').trim();
        if (prompt && process.env.GROQ_API_KEY) {
          try {
            // Trigger UI typing state for all active clients dynamically
            io.to(roomId).emit('ai_typing', { senderName: 'ChitChat AI 🤖', text: 'Replying...' });

            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            
            const chatCompletion = await groq.chat.completions.create({
              messages: [{ role: "user", content: prompt }],
              model: "llama-3.1-8b-instant", 
            });
            
            // Wipe UI placeholder since exact generation terminates here
            io.to(roomId).emit('ai_finished');

            const aiText = chatCompletion.choices[0]?.message?.content || "I couldn't process that.";
            const aiMessage = new Message({ roomId, senderName: "ChitChat AI 🤖", text: aiText });
            await aiMessage.save();
            
            io.to(roomId).emit('receive_message', aiMessage);
          } catch (aiErr) {
            console.error('Groq AI error:', aiErr);
            io.to(roomId).emit('ai_finished');
            
            const errMessage = new Message({ roomId, senderName: "ChitChat AI 🤖", text: "Oops, my neural networks are scrambled right now! Try again later." });
            await errMessage.save();
            io.to(roomId).emit('receive_message', errMessage);
          }
        }
      }

      // Check if message summons Image Generator
      if (text.trim().toLowerCase().startsWith('@image')) {
        const prompt = text.replace(/@image/i, '').trim();
        if (prompt) {
          // Clean the prompt to prevent API routing crashes from encoded question marks or slashes
          const cleanedPrompt = prompt.replace(/[^\w\s-]/gi, '').trim() || 'random';
          const encodedPrompt = encodeURIComponent(cleanedPrompt);
          const seed = Math.floor(Math.random() * 1000000);
          const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${seed}`;
          
          const imgMessage = new Message({ roomId, senderName: "Image Gen 🎨", text: `[IMAGE]:${imgUrl}` });
          await imgMessage.save();
          
          io.to(roomId).emit('receive_message', imgMessage);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    if (socket.roomId) {
      try {
        // Atomic decrement
        const room = await Room.findOneAndUpdate(
          { roomId: socket.roomId },
          { $inc: { occupancyCount: -1 } },
          { new: true }
        );
        
        if (room) {
          // If we hit exactly 0 users, trigger the countdown
          if (room.occupancyCount <= 0) {
            room.occupancyCount = 0; // Fix negative scaling if any edge-case exists
            room.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
            await room.save();
          }
          
          // Updated user list broadcast
          const roomSockets = await io.in(socket.roomId).fetchSockets();
          const users = roomSockets.map(s => ({
            socketId: s.id,
            userName: s.userName
          }));
          io.to(socket.roomId).emit('update_user_list', users);

          socket.to(socket.roomId).emit('user_left', { userName: socket.userName, timestamp: new Date() });
        }
      } catch (err) {
        console.error('Error on disconnect:', err);
      }
    }
  });
});

app.get('/', (req, res) => {
  res.send('ChitChat Backend Server is running');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
