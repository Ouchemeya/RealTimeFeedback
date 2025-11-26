"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Send, Code2, AlertCircle, RotateCw, Sparkles, MessageCircle, Volume2 } from 'lucide-react';

const WS_URL = 'ws://localhost:8000/ws';

const REACTIONS = [
  {
    id: "speed_up",
    label: "Speed Up",
    icon: RotateCw,
    gradient: "from-blue-500 to-cyan-500",
    color: "rgba(6, 182, 212, 0.8)",
  },
  {
    id: "slow_down",
    label: "Slow Down",
    icon: AlertCircle,
    gradient: "from-purple-500 to-pink-500",
    color: "rgba(236, 72, 153, 0.8)",
  },
  {
    id: "show_code",
    label: "Show Code",
    icon: Code2,
    gradient: "from-green-500 to-emerald-500",
    color: "rgba(34, 197, 94, 0.8)",
  },
  {
    id: "im_lost",
    label: "I'm Lost",
    icon: AlertCircle,
    gradient: "from-orange-500 to-red-500",
    color: "rgba(248, 113, 113, 0.8)",
  },
];

export default function AudiencePage() {
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState([]);
  const [recentReaction, setRecentReaction] = useState(null);
  const [flyingParticles, setFlyingParticles] = useState([]);
  const [reactionCounts, setReactionCounts] = useState({
    speed_up: 0,
    slow_down: 0,
    show_code: 0,
    im_lost: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [userId] = useState(`user_${Math.random().toString(36).substr(2, 9)}`);
  
  const wsRef = useRef(null);
  const containerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const questionsEndRef = useRef(null);

  // WebSocket connection management
  useEffect(() => {
    setMounted(true);
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    questionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [questions]);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('✅ Connected to feedback system');
        setConnectionStatus('connected');
        
        // Request initial stats
        ws.send(JSON.stringify({ type: 'get_stats' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            console.log('📡 Connection confirmed');
          } else if (message.type === 'stats') {
            setReactionCounts(message.counts || {
              speed_up: 0,
              slow_down: 0,
              show_code: 0,
              im_lost: 0,
            });
          } else if (message.type === 'reaction' && message.counts) {
            setReactionCounts(message.counts);
          } else if (message.type === 'question') {
            // Add question to local display
            const newQuestion = {
              id: `q-${Date.now()}`,
              text: message.text,
              timestamp: Date.now(),
              verified: false,
            };
            setQuestions(prev => [newQuestion, ...prev]);
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ :', error);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('🔌 Disconnected from feedback system');
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          setConnectionStatus('connecting');
          connectWebSocket();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect:', err);
      setConnectionStatus('error');
    }
  };

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected');
      return false;
    }
  };

  const handleReaction = (id, e) => {
    // Send reaction to backend
    const sent = sendMessage({
      type: 'reaction',
      reaction: id,
      user_id: userId,
    });

    if (!sent) return;

    // Visual feedback
    setRecentReaction(id);
    
    // Update local count optimistically
    setReactionCounts(prev => ({
      ...prev,
      [id]: prev[id] + 1,
    }));

    // Create flying particles
    if (containerRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const newParticles = Array.from({ length: 8 }).map((_, i) => ({
        id: `${id}-${Date.now()}-${i}`,
        x: centerX,
        y: centerY,
        angle: (i / 8) * Math.PI * 2,
        distance: 100 + Math.random() * 80,
        color: REACTIONS.find(r => r.id === id)?.color,
      }));
      
      setFlyingParticles(prev => [...prev, ...newParticles]);

      setTimeout(() => {
        setFlyingParticles(prev => 
          prev.filter(p => !p.id.startsWith(`${id}-${Date.now()}`))
        );
      }, 1200);
    }

    setTimeout(() => setRecentReaction(null), 600);
  };

  const handleQuestion = () => {
    if (!question.trim()) return;
    
    const sent = sendMessage({
      type: 'question',
      text: question.trim(),
      user_id: userId,
    });

    if (sent) {
      setQuestion("");
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-400';
      case 'connecting': return 'bg-yellow-400';
      case 'disconnected': return 'bg-orange-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live • Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Reconnecting...';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/10 to-slate-950 flex flex-col px-4 overflow-hidden"
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-morph" />
        <div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-morph"
          style={{ animationDelay: "3s" }}
        />
        <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-indigo-500/12 rounded-full blur-3xl animate-ambient-float" />
      </div>

      {/* Flying particles */}
      {flyingParticles.map((particle) => {
        const tx = Math.cos(particle.angle) * particle.distance;
        const ty = Math.sin(particle.angle) * particle.distance;
        return (
          <div
            key={particle.id}
            className="fixed w-3 h-3 rounded-full pointer-events-none"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              background: particle.color,
              animation: 'particle-float 1.2s ease-out forwards',
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
            }}
          />
        );
      })}

      <div className="relative z-10 w-full max-w-6xl mx-auto py-6 flex flex-col h-screen">
        {/* Header */}
        <div className={`mb-8 text-center ${mounted ? 'animate-float-in-down' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-cyan-500/30 rounded-full mb-6 backdrop-blur-sm hover:border-cyan-500/60 transition-colors duration-300">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()} relative ${connectionStatus === 'connected' ? 'pulse-ring' : ''}`} />
            <span className="text-xs font-medium text-white/70">{getStatusText()}</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3 text-balance">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient-shift">
              Share Your <span className="text-accent-yellow-glow">Feedback</span>
            </span>
          </h1>
          <p className="text-lg text-white/50">
            Help shape this presentation <span className="text-accent-yellow">in real-time</span>
          </p>
        </div>

        {/* Main content grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          {/* Reactions card - takes 2 columns */}
          <div
            className={`lg:col-span-2 glass rounded-2xl p-8 border border-cyan-500/20 flex flex-col ${mounted ? 'animate-float-in-up' : 'opacity-0'}`}
          >
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Quick Reaction
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {REACTIONS.map((reaction, idx) => {
                const Icon = reaction.icon;
                const isActive = recentReaction === reaction.id;
                const count = reactionCounts[reaction.id];
                return (
                  <button
                    key={reaction.id}
                    onClick={(e) => handleReaction(reaction.id, e)}
                    disabled={connectionStatus !== 'connected'}
                    className={`relative group overflow-hidden rounded-xl p-6 transition-all duration-300 btn-premium ${
                      isActive
                        ? `bg-gradient-to-br ${reaction.gradient} text-white shadow-lg shadow-cyan-500/40 scale-105`
                        : "bg-white/5 border border-cyan-500/20 text-white hover:border-cyan-500/50 hover:bg-white/10 hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                    style={{
                      animationName: mounted ? 'float-in-up' : 'none',
                      animationDuration: '0.6s',
                      animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                      animationDelay: `${0.1 * idx}s`,
                      animationFillMode: 'both',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative text-center">
                      <Icon
                        className={`w-8 h-8 mx-auto mb-2 transition-transform ${isActive ? 'scale-125 animate-rotate-in' : 'group-hover:scale-110'}`}
                      />
                      <p className="font-semibold text-sm">{reaction.label}</p>
                      {count > 0 && (
                        <div className="text-xs text-white/70 mt-1 font-medium animate-scale-in">{count}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Questions panel - takes 1 column on the right */}
          <div
            className={`glass rounded-2xl p-6 border border-cyan-500/20 flex flex-col overflow-hidden ${mounted ? 'animate-float-in-right' : 'opacity-0'}`}
          >
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Questions <span className="text-accent-yellow">Live</span> ({questions.length})
            </h2>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-4">
              {questions.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-white/40 text-sm">No questions yet</p>
                    <p className="text-white/20 text-xs mt-1">Ask your first question!</p>
                  </div>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="glass rounded-lg p-3 border border-cyan-500/10 hover:border-cyan-500/30 transition-all duration-300 group cursor-pointer"
                    style={{
                      animationName: "slide-in-up",
                      animationDuration: "0.5s",
                      animationTimingFunction: "ease-out",
                      animationDelay: `${idx * 0.05}s`,
                      animationFillMode: "both",
                    }}
                  >
                    <p className="text-sm text-white/80 line-clamp-2 group-hover:text-white transition-colors">
                      {q.text}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-white/40">just now</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={questionsEndRef} />
            </div>

            {/* Question input at the bottom of the questions panel */}
            <div className="mt-auto pt-4 border-t border-cyan-500/10">
              <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageCircle className="w-3 h-3" />
                Ask <span className="text-accent-yellow">Something</span>
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuestion()}
                  placeholder="What's on your mind?"
                  disabled={connectionStatus !== 'connected'}
                  className="flex-1 bg-white/5 border border-cyan-500/20 text-white placeholder-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm disabled:opacity-50"
                />
                <button
                  onClick={handleQuestion}
                  disabled={!question.trim() || connectionStatus !== 'connected'}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center btn-premium"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div
          className={`mt-8 text-center text-sm text-white/40 ${mounted ? 'animate-float-in-up' : 'opacity-0'}`}
          style={{ animationDelay: '0.3s' }}
        >
          <p>
            Total reactions:{" "}
            <span className="text-accent-yellow font-bold">
              {Object.values(reactionCounts).reduce((a, b) => a + b, 0)}
            </span>
          </p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 217, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 217, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 217, 255, 0.4);
        }
        .text-accent-yellow-glow {
          color: rgba(255, 215, 0, 0.8);
        }
        .text-accent-yellow {
          color: rgba(255, 215, 0, 0.8);
        }
        .animate-yellow-pulse {
          animation: yellow-pulse 1.5s infinite;
        }
        @keyframes yellow-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes morph {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float-in-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes particle-float {
          to {
            transform: translate(var(--tx), var(--ty));
            opacity: 0;
            scale: 0.5;
          }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ambient-float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
        @keyframes rotate-in {
          from { transform: rotate(-180deg) scale(0); }
          to { transform: rotate(0) scale(1.25); }
        }
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        .animate-morph {
          animation: morph 8s ease-in-out infinite;
        }
        .animate-gradient-shift {
          background-size: 200% auto;
          animation: gradient-shift 3s ease infinite;
        }
        .animate-ambient-float {
          animation: ambient-float 6s ease-in-out infinite;
        }
        .animate-rotate-in {
          animation: rotate-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .pulse-ring::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: currentColor;
          animation: pulse-ring 1.5s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        .glass {
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(12px);
        }
        .btn-premium {
          position: relative;
        }
        .btn-premium::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}