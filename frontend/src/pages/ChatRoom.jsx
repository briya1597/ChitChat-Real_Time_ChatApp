import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, Send, Clock, Shield, MessageCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ChatRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // If user tried to navigate here directly without passing passkey and name, kick them out
    if (!location.state?.userName || !location.state?.passkey) {
      navigate(`/join/${roomId}`);
      return;
    }

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_room', { 
        roomId, 
        userName: location.state.userName 
      });
    });

    newSocket.on('room_history', (history) => {
      setMessages(history);
      scrollToBottom();
    });

    newSocket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });

    newSocket.on('user_joined', ({ userName }) => {
      setMessages(prev => [...prev, { type: 'system', text: `${userName} securely joined.` }]);
      scrollToBottom();
    });

    newSocket.on('user_left', ({ userName }) => {
      setMessages(prev => [...prev, { type: 'system', text: `${userName} left.` }]);
      scrollToBottom();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, location, navigate]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('send_message', {
      roomId,
      senderName: location.state.userName,
      text: newMessage
    });
    setNewMessage('');
  };

  const handleLeave = () => {
    // Navigating away will unmount the component and cleanup socket
    navigate('/');
  };

  if (!location.state?.userName) return null;

  return (
    <div className="flex flex-col h-[100dvh] bg-background relative overflow-hidden">
      {/* Header */}
      <header className="glass-card flex items-center justify-between px-6 py-4 z-20 border-b border-surface/50 rounded-none relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-100 flex items-center gap-2">
              Secure Room <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </h1>
            <div className="text-xs text-textSecondary font-mono flex items-center gap-1">
              ID: {roomId} <span className="opacity-50">|</span> <Clock size={12} className="inline ml-1"/> Disposes 30m after empty
            </div>
          </div>
        </div>
        <button 
          onClick={handleLeave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-400/10 hover:bg-red-400/20 text-red-500 transition-colors font-medium text-sm border border-red-500/20"
        >
          <LogOut size={16} /> Leave
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 z-10 scrollbar-thin scrollbar-thumb-surface scrollbar-track-transparent">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Message */}
          <div className="flex justify-center mb-8">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-4 text-center max-w-sm backdrop-blur-sm">
              <MessageCircle size={32} className="mx-auto text-primary mb-2 opacity-80" />
              <p className="text-sm font-medium text-slate-300">Welcome, {location.state.userName}!</p>
              <p className="text-xs text-slate-400 mt-1">Messages are ephemeral. Room is protected.</p>
              <p className="text-xs text-primary mt-3 flex justify-center items-center gap-1 font-medium bg-primary/10 w-fit mx-auto px-4 py-2 rounded-full border border-primary/20 shadow-sm flex-wrap text-center">
                <Zap size={14}/> Type <b>@AI</b> to summon ChitChat AI | <b>@Image</b> to generate art
              </p>
            </div>
          </div>

          {messages.map((msg, idx) => {
            if (msg.type === 'system') {
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  key={idx} className="flex justify-center my-4"
                >
                  <span className="text-xs text-slate-400 bg-surface/50 px-4 py-1.5 rounded-full border border-white/5 shadow-inner">
                    {msg.text}
                  </span>
                </motion.div>
              );
            }

            const isMine = msg.senderName === location.state.userName;
            const isAI = msg.senderName === "ChitChat AI 🤖" || msg.senderName === "Image Gen 🎨";

            let bubbleClass = isMine 
              ? 'bg-primary text-white rounded-br-sm shadow-primary/25' 
              : 'bg-surface border border-white/10 text-slate-200 rounded-bl-sm shadow-black/20';

            if (isAI) {
              bubbleClass = 'bg-gradient-to-r from-indigo-500 to-purple-600 border border-indigo-400/50 text-white rounded-bl-sm shadow-purple-500/25 shadow-lg relative overflow-hidden';
            }

            return (
              <motion.div 
                initial={{ opacity: 0, x: isMine ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={idx} 
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                {!isMine && (
                  <span className={`text-xs mb-1 ml-1 font-medium flex items-center gap-1 ${isAI ? 'text-indigo-400 bg-indigo-500/10 px-2 rounded-full border border-indigo-500/20' : 'text-textSecondary'}`}>
                    {msg.senderName}
                  </span>
                )}
                <div 
                  className={`max-w-[85%] sm:max-w-[75%] px-5 py-3 rounded-2xl shadow-lg leading-relaxed ${bubbleClass}`}
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                >
                  {isAI && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />}
                  <span className="relative z-10 w-full">
                    {msg.text.startsWith('[IMAGE]:') ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <img 
                          src={msg.text.replace('[IMAGE]:', '')} 
                          alt="AI Generated Art" 
                          className="rounded-xl shadow-md w-full max-w-[320px] object-cover border border-white/10" 
                          loading="lazy" 
                        />
                      </div>
                    ) : (
                      msg.text
                    )}
                  </span>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 z-20 bg-background/80 backdrop-blur-md border-t border-surface/50">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-surface border border-white/10 rounded-full pl-6 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-200 shadow-xl transition-all"
            autoComplete="off"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="absolute right-2 w-10 h-10 flex items-center justify-center rounded-full bg-primary hover:bg-primaryHover disabled:bg-surface disabled:text-textSecondary text-white transition-colors"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>

      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}
