import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, Send, Clock, Shield, MessageCircle, Zap, Lock, Unlock, Paperclip, User } from 'lucide-react';
import { motion } from 'framer-motion';
import config from '../config';

const ImageBubble = ({ src }) => {
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative w-full max-w-[320px] min-h-[220px] bg-black/20 rounded-xl overflow-hidden shadow-md border border-white/10 flex items-center justify-center">
      {loading && (
        <span className="absolute flex items-center gap-2 font-semibold tracking-wide text-white/80 z-20 text-sm">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          Generating Art...
        </span>
      )}
      <img 
        src={src} 
        alt="AI Generated Art" 
        referrerPolicy="no-referrer"
        className={`w-full h-auto object-cover relative z-10 transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        loading="lazy"
      />
    </div>
  );
};

export default function ChatRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomUsers, setRoomUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [typingAI, setTypingAI] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const fileInputRef = useRef(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check if user is the room creator
    const creatorToken = localStorage.getItem(`creator_${roomId}`);
    setIsCreator(!!creatorToken);

    // If user tried to navigate here directly without passing passkey and name, kick them out
    if (!location.state?.userName || !location.state?.passkey) {
      navigate(`/join/${roomId}`);
      return;
    }

    const newSocket = io(config.SOCKET_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5
    });
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_room', { 
        roomId, 
        userName: location.state.userName,
        creatorSessionId: localStorage.getItem(`creator_${roomId}`)
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('room_history', (history) => {
      setMessages(history);
      scrollToBottom();
    });

    newSocket.on('room_lock_status', (status) => {
      setIsLocked(status);
    });

    newSocket.on('receive_message', (msg) => {
      setMessages(prev => {
        // Clear local "Uploading File..." placeholders for the sender
        const filtered = prev.filter(m => !(m.type === 'generating' && m.senderName === msg.senderName && m.text === 'Uploading File...'));
        return [...filtered, msg];
      });
      scrollToBottom();
    });

    // Native Typing Listeners
    newSocket.on('ai_typing', (data) => {
      setTypingAI(data);
      scrollToBottom();
    });
    
    newSocket.on('ai_finished', () => {
      setTypingAI(null);
      scrollToBottom();
    });

    newSocket.on('update_user_list', (users) => {
      setRoomUsers(users);
    });

    newSocket.on('kicked', () => {
      alert('You have been removed from the room by the administrator.');
      navigate('/');
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

    const data = {
      roomId,
      senderName: location.state.userName,
      text: newMessage
    };

    socket.emit('send_message', data);
    setNewMessage('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File is too large! Maximum allowed size is 15MB.");
      return;
    }

    setMessages(prev => [...prev, { type: 'generating', senderName: location.state.userName, text: 'Uploading File...' }]);
    scrollToBottom();

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${config.API_URL}/api/rooms/${roomId}/upload`, {
        method: 'POST',
        headers: { 'x-room-id': roomId },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        socket.emit('send_message', {
          roomId,
          senderName: location.state.userName,
          text: '',
          fileUrl: data.fileUrl,
          fileType: data.fileType
        });
      } else {
        alert(data.error || 'Upload failed');
        setMessages(prev => prev.filter(m => !(m.type === 'generating' && m.senderName === location.state.userName)));
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed checking connection');
      setMessages(prev => prev.filter(m => !(m.type === 'generating' && m.senderName === location.state.userName)));
    } finally {
      e.target.value = ''; // Reset file input securely
    }
  };

  const handleLeave = () => {
    // Navigating away will unmount the component and cleanup socket
    navigate('/');
  };

  if (!location.state?.userName) return null;

  const handleToggleLock = () => {
    if (!socket || !isCreator) return;
    socket.emit('toggle_lock', { 
      roomId, 
      creatorSessionId: localStorage.getItem(`creator_${roomId}`) 
    });
  };

  const handleKick = (socketIdToKick) => {
    if (!socket || !isCreator) return;
    if (window.confirm("Are you sure you want to remove this user?")) {
      socket.emit('kick_user', {
        roomId,
        socketIdToKick,
        creatorSessionId: localStorage.getItem(`creator_${roomId}`)
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <header className="border-b border-white/5 bg-surface/50 backdrop-blur-xl z-20 sticky top-0 shrink-0">
        <div className="max-w-7xl mx-auto w-full px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/20">
              <Shield size={20} className="drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg text-white tracking-tight leading-none">VapourChat</h2>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-rose-500 shadow-[0_0_8px_rgba(251,113,133,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'} animate-pulse`} />
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-400 mt-1">
                <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded border border-white/10 opacity-80 uppercase leading-none">ID: {roomId}</span>
                <span className="flex items-center gap-1 opacity-70"><Clock size={12}/> Disposes 30m after empty</span>
                {isLocked && <span className="flex items-center gap-1 text-rose-400 opacity-90"><Lock size={12}/> Locked</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowUsers(!showUsers)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:bg-white/5 border border-white/10 transition-all text-sm font-medium relative"
            >
              <User size={16} />
              <span className="hidden sm:block">People</span>
              {roomUsers.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] flex items-center justify-center rounded-full text-white border border-background">
                  {roomUsers.length}
                </span>
              )}
            </button>
            
            {isCreator && (
              <button 
                onClick={handleToggleLock}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 border ${
                  isLocked 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                }`}
              >
                {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                {isLocked ? 'Unlock Room' : 'Lock Room'}
              </button>
            )}
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-300 text-sm font-medium"
            >
              <LogOut size={16} />
              <span className="hidden sm:block">Leave</span>
            </button>
          </div>
        </div>
      </header>

      {/* User Sidebar Overlay */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: showUsers ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-80 bg-surface/95 backdrop-blur-2xl border-l border-white/10 z-[100] shadow-2xl p-6"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="text-primary" /> Active Users
          </h3>
          <button onClick={() => setShowUsers(false)} className="text-slate-400 hover:text-white p-2">
            <LogOut size={20} className="rotate-180" />
          </button>
        </div>

        <div className="space-y-4">
          {roomUsers.map((u, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                  {u.userName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {u.userName} {u.socketId === socket?.id && <span className="text-[10px] text-primary opacity-80">(You)</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">Connected via Secure Link</p>
                </div>
              </div>

              {isCreator && u.socketId !== socket?.id && (
                <button 
                  onClick={() => handleKick(u.socketId)}
                  className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove User"
                >
                  <Shield size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {roomUsers.length === 0 && (
          <p className="text-center text-slate-500 mt-10 italic">No other users online.</p>
        )}
      </motion.div>
      
      {showUsers && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
          onClick={() => setShowUsers(false)}
        />
      )}

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-6 z-10 scrollbar-thin scrollbar-thumb-surface scrollbar-track-transparent flex flex-col ${messages.length === 0 ? 'justify-center' : ''}`}>
        <div className="max-w-4xl w-full mx-auto space-y-6">
          {/* Welcome Message */}
          <div className="flex justify-center mb-8">
            <div className="bg-primary/10 border border-primary/20 rounded-3xl px-8 py-10 text-center max-w-lg backdrop-blur-md shadow-xl">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30">
                <MessageCircle size={32} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Welcome, {location.state.userName}!</h3>
              <p className="text-slate-400 mb-6 text-sm">Your secure ephemeral space is ready.</p>
              
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-1">Capabilities</p>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 text-xs text-slate-300">
                  <Zap size={14} className="text-primary shrink-0"/>
                  <span>Type <b>@AI</b> for instant answers</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 text-xs text-slate-300">
                  <Zap size={14} className="text-rose-400 shrink-0"/>
                  <span>Type <b>@Image</b> for AI art</span>
                </div>
              </div>
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
            const isGenerating = msg.type === 'generating';

            let bubbleClass = isMine 
              ? 'bg-primary text-white rounded-br-sm shadow-primary/25' 
              : 'bg-surface border border-white/10 text-slate-200 rounded-bl-sm shadow-black/20';

            if (isAI) {
              bubbleClass = 'bg-gradient-to-r from-violet-600 to-rose-600 border border-violet-400/50 text-white rounded-bl-sm shadow-rose-500/25 shadow-lg relative overflow-hidden';
            }

            // Message Formatting Blocks natively handling Video, Images, Audio bindings
            let messageContent;

            if (msg.fileUrl) {
              const fileSrc = `${config.API_URL}${msg.fileUrl}`;
              if (msg.fileType?.startsWith('image/')) {
                messageContent = <img src={fileSrc} alt="Uploaded attachment" className="rounded-xl shadow-md w-full max-w-[320px] object-cover bg-black/20" loading="lazy" />;
              } else if (msg.fileType?.startsWith('video/')) {
                messageContent = <video src={fileSrc} controls className="rounded-xl shadow-md w-full max-w-[320px] bg-black/40" />;
              } else {
                messageContent = (
                  <a href={fileSrc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline underline-offset-4 text-blue-300 hover:text-white transition-colors py-1">
                    <Paperclip size={18} /> Download Attached File
                  </a>
                );
              }
            } else if (msg.text?.startsWith('[IMAGE]:')) {
              messageContent = (
                <div className="flex flex-col gap-2 mt-1">
                  <ImageBubble src={msg.text.replace('[IMAGE]:', '').trim()} />
                </div>
              );
            } else if (isGenerating) {
              messageContent = (
                <span className="flex items-center gap-2 font-medium tracking-wide">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  {msg.text}
                </span>
              );
            } else {
              messageContent = msg.text;
            }

            return (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} mb-5 group`}
              >
                {!isMine && (
                  <span className="text-xs font-medium text-slate-400 mb-1.5 ml-1 opacity-80 flex items-center gap-2">
                    {msg.senderName}
                    {isAI && <Zap size={10} className="text-indigo-400" />}
                  </span>
                )}
                <div 
                  className={`max-w-[85%] sm:max-w-[75%] px-5 py-3 rounded-2xl shadow-lg leading-relaxed ${bubbleClass}`}
                  style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                >
                  {isAI && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />}
                  <span className="relative z-10 w-full">
                    {messageContent}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Real-time Loading UI Placeholder locked at bottom of chat */}
          {typingAI && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start w-full relative group"
            >
              <div className="max-w-[85%] sm:max-w-[75%] px-5 py-3 rounded-2xl shadow-lg leading-relaxed bg-gradient-to-r from-violet-600 to-rose-600 border border-violet-400/50 text-white rounded-bl-sm shadow-rose-500/25 relative overflow-hidden animate-pulse opacity-80">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <span className="relative z-10 w-full">
                   <span className="flex items-center gap-3 font-medium tracking-wide">
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                     {typingAI.text}
                   </span>
                </span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 z-20 bg-background/80 backdrop-blur-md border-t border-surface/50">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-400 bg-transparent hover:bg-white/5 rounded-full transition-all duration-300 z-30 cursor-pointer"
            title="Attach a File, Image or Video"
          >
            <Paperclip size={20} />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-surface/80 border border-white/10 text-white placeholder-slate-400 rounded-full pl-14 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-lg backdrop-blur-md"
          />
          
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-primary hover:bg-primary/80 text-white rounded-full disabled:opacity-50 disabled:hover:bg-primary disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/25"
          >
            <Send size={18} className="translate-x-[1px]" />
          </button>
        </form>
      </div>

      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}
