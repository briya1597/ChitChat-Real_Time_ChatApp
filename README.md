# 💨 VapourChat: Luxe Ephemeral Messaging

VapourChat is a premium, high-performance real-time chat application built for security, speed, and intelligence. Featuring a stunning "Luxe Midnight" aesthetic, it combines secure ephemeral messaging with integrated AI capabilities to create a state-of-the-art communication experience.

![VapourChat Banner](https://image.pollinations.ai/prompt/premium%20dark%20ui%20chat%20application%20mockup%20glassmorphism%20purple%20accents)

## ✨ Core Features

### 🌌 Luxe Midnight Aesthetics
- **Premium Design**: A curated palette of Deep Charcoal, Amethyst, and Rose Gold.
- **Glassmorphism**: Sophisticated translucent layers and subtle micro-animations using Framer Motion.
- **Ultra-Wide Optimization**: Intelligent layout containers that maintain perfect alignment on all screen sizes.

### 🧠 Integrated Intelligence
- **@AI Assistant**: Summon Llama 3 (via Groq) directly in your chat for instant research, code snippets, or creative writing.
- **@Image Generation**: Transform text to art instantly using high-quality AI image generation.

### 🛡️ Privacy & Ephemerality
- **Self-Disposing Rooms**: Automated room cleanup via `node-cron` ensures rooms and data are purged 30 minutes after the last participant leaves.
- **Dual-Layer Security**: Passkey-protected entry combined with cryptographic session tracking to prevent unauthorized access.
- **Room Locking**: Admin capability to "Seal" a room, preventing any new members from joining once a session has started.

### ⚡ Real-Time Excellence
- **Instant Messaging**: Powered by Socket.io for sub-millisecond message delivery.
- **Rich Media**: Native support for image previews, video playback, and file attachments.
- **Administrative Suite**: Real-time participant monitoring with the ability to "Kick" users instantly.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: MongoDB Atlas (Mongoose).
- **AI Engine**: Groq (Llama 3), Pollinations AI.
- **Deployment**: Vercel (Frontend), Render (Backend).

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account
- Groq API Key

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/VapourChat.git

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 3. Environment Setup
Create a `.env` file in the `backend` directory:
```env
MONGODB_URI=your_mongodb_uri
GROQ_API_KEY=your_groq_key
PORT=5000
```

Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000
```

### 4. Run the Application
```bash
# Start Backend (from backend folder)
npm run dev

# Start Frontend (from frontend folder)
npm run dev
```

---

## 📜 Ephemeral Policy
VapourChat is designed for transient communication. All messages, files, and room metadata are permanently deleted from our servers 30 minutes after a room becomes inactive. **Privacy is not an option; it is the default.**

---

Designed with ❤️ for the modern web.
