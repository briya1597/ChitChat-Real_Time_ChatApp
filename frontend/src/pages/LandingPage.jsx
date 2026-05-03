import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const [passkey, setPasskey] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!passkey) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey })
      });
      const data = await response.json();
      if (response.ok) {
        setCreatedRoom(data.roomId);
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

  const copyLink = () => {
    const link = `${window.location.origin}/join/${createdRoom}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const joinRoom = () => {
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
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400 mb-4 tracking-tight">
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
          <form onSubmit={handleCreateRoom} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">
                Set a Room Passkey
              </label>
              <input 
                type="text" 
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Secure code (e.g., secret123)"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary placeholder-slate-500 transition-all font-medium"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isCreating}
              className="w-full py-3 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50"
            >
              {isCreating ? 'Creating Room...' : 'Create Secure Room'}
            </button>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-xl border border-emerald-500/20 font-medium flex items-center justify-center gap-2">
              <Shield size={18} /> Room Created Successfully
            </div>
            
            <div className="bg-slate-800/50 p-4 flex items-center justify-between gap-4 rounded-xl border border-slate-700/50">
                <span className="font-mono text-sm text-textSecondary break-all text-left">
                  {`${window.location.origin}/join/${createdRoom}`}
                </span>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={copyLink}
                className="flex-1 py-3 px-4 bg-slate-700/50 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors border border-slate-600/50"
              >
                Copy Link
              </button>
              <button 
                onClick={joinRoom}
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
        className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-20 max-w-2xl relative z-10"
      >
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
            <Zap size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-200 mb-1">Instant Access</h3>
            <p className="text-textSecondary text-sm leading-relaxed">Join with a simple link. No accounts, forms, or signups required. Just type the passkey and chat.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/20">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-200 mb-1">Auto Destructs</h3>
            <p className="text-textSecondary text-sm leading-relaxed">Rooms and all message history are cleanly purged exactly 30 minutes after the last person leaves.</p>
          </div>
        </div>
      </motion.div>

      {/* Decorative blurred background elements */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10 pointer-events-none" />
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] -z-10 pointer-events-none" />
    </div>
  );
}
