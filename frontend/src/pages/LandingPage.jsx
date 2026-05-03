import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import config from '../config';

export default function LandingPage() {
  const [passkey, setPasskey] = useState('');
  const [roomToJoin, setRoomToJoin] = useState(''); // New state for joining
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!passkey) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(`${config.API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey })
      });
      const data = await response.json();
      
      if (response.ok) {
        setCreatedRoom(data.roomId);
        setPasskey(data.passkey); // Sync with backend in case it changed or for join flow
        // Persist administrative privileges across tab refreshes and browser restarts
        localStorage.setItem(`creator_${data.roomId}`, data.creatorSessionId);
      } else {
        alert(data.error || 'Error creating room');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to server');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinExisting = (e) => {
    e.preventDefault();
    if (roomToJoin.trim()) {
      navigate(`/join/${roomToJoin.trim()}`);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/join/${createdRoom}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const joinCreatedRoom = () => {
    // Navigate with passkey so they don't have to type it again
    navigate(`/join/${createdRoom}`, { state: { passkey } });
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex justify-center mb-4 text-primary">
          <MessageSquare size={64} />
        </div>
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-rose-400 mb-4 tracking-tight">
          ChitChat
        </h1>
        <p className="text-textSecondary text-xl max-w-lg mx-auto">
          Secure, real-time, ephemeral chat rooms. No history saved indefinitely; disposes entirely 30 mins after emptiness.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-8 rounded-2xl w-full max-w-md relative z-10"
      >
        {!createdRoom ? (
          <div className="space-y-6">
            <div className="flex p-1 bg-slate-800/80 rounded-xl mb-6">
              <button 
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'create' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Create Room
              </button>
              <button 
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'join' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Join Room
              </button>
            </div>

            {activeTab === 'create' ? (
              <form onSubmit={handleCreateRoom} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">
                    Set a Room Passkey
                  </label>
                  <input 
                    type="text" 
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="Secure code (e.g., secret123)"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-slate-600 transition-all font-medium"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full py-4 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Zap size={18} />}
                  {isCreating ? 'Creating...' : 'Create Secure Room'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinExisting} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2 ml-1">
                    Enter Room ID
                  </label>
                  <input 
                    type="text" 
                    value={roomToJoin}
                    onChange={(e) => setRoomToJoin(e.target.value)}
                    placeholder="e.g. ab12cd"
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder-slate-600 transition-all font-medium font-mono uppercase"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-4 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Join Room
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl border border-emerald-500/20 font-medium flex items-center justify-center gap-2">
              <Shield size={18} /> Room Created Successfully
            </div>
            
            <div className="bg-slate-900/80 p-4 flex items-center justify-between gap-4 rounded-xl border border-slate-700/50 shadow-inner">
                <span className="font-mono text-sm text-blue-400 break-all text-left">
                  {`${window.location.origin}/join/${createdRoom}`}
                </span>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={copyLink}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors border border-slate-700/50"
              >
                Copy Link
              </button>
              <button 
                onClick={joinCreatedRoom}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary/25"
              >
                Enter Chat
              </button>
            </div>
          </div>
        )}
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mt-20 max-w-4xl relative z-10"
      >
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
            <Zap size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-200 mb-1">AI Integrated</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Mention <code className="text-indigo-400">@AI</code> to trigger ChitChat AI assistant powered by Llama 3 for instant answers inside your room.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/20">
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-200 mb-1">Image Generation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Type <code className="text-purple-400">@Image</code> followed by a description to generate high-quality AI art instantly for everyone.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-200 mb-1">Encrypted & Ephemeral</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Rooms are passkey protected. All data, files and messages are irreversibly purged 30 minutes after your session ends.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 shrink-0 border border-orange-500/20">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-200 mb-1">Admin Controls</h3>
            <p className="text-slate-400 text-sm leading-relaxed">As a creator, lock your room to prevent any new participants from joining, ensuring total privacy for your group.</p>
          </div>
        </div>
      </motion.div>

      {/* Decorative blurred background elements */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10 pointer-events-none" />
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-rose-500/20 rounded-full blur-[128px] -z-10 pointer-events-none" />
    </div>
  );
}
