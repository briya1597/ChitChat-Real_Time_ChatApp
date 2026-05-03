const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const roomRoutes = require('./routes/roomRoutes');
const startCleanupJob = require('./utils/cronJob');
const Room = require('./models/Room');
const Message = require('./models/Message');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
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

  socket.on('join_room', async ({ roomId, userName }) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    try {
      // Atomic increment and clear expiration to perfectly handle React Strict Mode race conditions
      const room = await Room.findOneAndUpdate(
        { roomId },
        { $inc: { occupancyCount: 1 }, $set: { expiresAt: null } },
        { new: true }
      );
      
      if (room) {
        const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
        socket.emit('room_history', messages);

        // Notify others
        socket.to(roomId).emit('user_joined', { userName, timestamp: new Date() });
      }
    } catch (err) {
      console.error('Error joining room:', err);
    }
  });

  socket.on('send_message', async (data) => {
    const { roomId, senderName, text } = data;
    try {
      const message = new Message({ roomId, senderName, text });
      await message.save();

      io.to(roomId).emit('receive_message', message);

      // Check if message summons Meta AI
      if (text.trim().toLowerCase().startsWith('@ai')) {
        const prompt = text.replace(/@ai/i, '').trim();
        if (prompt && process.env.GROQ_API_KEY) {
          try {
            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            
            const chatCompletion = await groq.chat.completions.create({
              messages: [{ role: "user", content: prompt }],
              model: "llama-3.1-8b-instant", 
            });
            
            const aiText = chatCompletion.choices[0]?.message?.content || "I couldn't process that.";
            const aiMessage = new Message({ roomId, senderName: "ChitChat AI 🤖", text: aiText });
            await aiMessage.save();
            
            io.to(roomId).emit('receive_message', aiMessage);
          } catch (aiErr) {
            console.error('Groq AI error:', aiErr);
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
          // Use the image subdomain to securely retrieve raw image blobs instead of HTML pages
          const encodedPrompt = encodeURIComponent(prompt);
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
  console.log(`Server listening on port ${PORT}`);
});
