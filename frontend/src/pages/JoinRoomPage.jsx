import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Key, User } from 'lucide-react';

export default function JoinRoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [passkey, setPasskey] = useState(location.state?.passkey || '');
  const [userName, setUserName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!passkey || !userName) return;

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/rooms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, passkey })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Navigate securely to chat room, passing name and verified passkey in state
        navigate(`/chat/${roomId}`, { state: { userName, passkey } });
      } else {
        setError(data.error || 'Invalid passkey or room expired.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to server.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 relative">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="glass-card p-8 rounded-2xl w-full max-w-md relative z-10"
      >
        <div className="flex justify-center mb-6 text-primary">
          <Shield size={48} />
        </div>
        <h2 className="text-3xl font-bold font-heading text-center mb-2 text-white">Join Secure Room</h2>
        <p className="text-textSecondary text-center mb-8 font-mono text-sm bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
          ID: {roomId}
        </p>

        <form onSubmit={handleJoin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2 flex items-center gap-2">
              <User size={16} /> Your Display Name
            </label>
            <input 
              type="text" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary placeholder-slate-500 transition-all font-medium"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2 flex items-center gap-2">
              <Key size={16} /> Room Passkey
            </label>
            <input 
              type="text" 
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Enter secure passkey"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-textPrimary placeholder-slate-500 transition-all font-medium"
              required
            />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-center">
              {error}
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={isVerifying}
            className="w-full mt-4 py-3 px-4 bg-primary hover:bg-primaryHover text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] disabled:opacity-50"
          >
            {isVerifying ? 'Verifying...' : 'Unlock Chat'}
          </button>
        </form>
      </motion.div>
      
      {/* Background decorations */}
      <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10 pointer-events-none" />
    </div>
  );
}
