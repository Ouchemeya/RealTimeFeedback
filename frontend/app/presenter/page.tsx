"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Activity, AlertTriangle, TrendingUp, Zap, RotateCw, Code2, AlertCircle, MessageSquare, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const WS_URL = 'ws://localhost:8000/ws';

const REACTIONS = [
  {
    id: "speed_up",
    label: "Speed Up",
    icon: RotateCw,
    color: "from-blue-500 to-cyan-500",
    bg: "from-blue-500/10 to-cyan-500/10",
  },
  {
    id: "slow_down",
    label: "Slow Down",
    icon: AlertCircle,
    color: "from-purple-500 to-pink-500",
    bg: "from-purple-500/10 to-pink-500/10",
  },
  {
    id: "show_code",
    label: "Show Code",
    icon: Code2,
    color: "from-green-500 to-emerald-500",
    bg: "from-green-500/10 to-emerald-500/10",
  },
  {
    id: "im_lost",
    label: "I'm Lost",
    icon: AlertCircle,
    color: "from-orange-500 to-red-500",
    bg: "from-orange-500/10 to-red-500/10",
  },
];

export default function PresenterDashboard() {
  const [mounted, setMounted] = useState(false);
  const [reactionCounts, setReactionCounts] = useState({
    speed_up: 0,
    slow_down: 0,
    show_code: 0,
    im_lost: 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [recentReactions, setRecentReactions] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [activeConnections, setActiveConnections] = useState(0);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const alertIdCounterRef = useRef(0);
  const previousCountsRef = useRef({ speed_up: 0, slow_down: 0, show_code: 0, im_lost: 0 });

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

  // Auto-remove alerts after 5 seconds
  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setTimeout(() => {
      setAlerts(prev => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [alerts]);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('✅ Presenter connected to feedback system');
        setConnectionStatus('connected');
        
        // Request initial stats
        ws.send(JSON.stringify({ type: 'get_stats' }));
        
        // Poll for stats every 5 seconds
        const pollInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'get_stats' }));
          }
        }, 5000);
        
        ws.pollInterval = pollInterval;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            console.log('📡 Connection confirmed');
          } else if (message.type === 'reaction') {
            // New reaction received
            if (message.counts) {
              handleReactionUpdate(message.counts);
            }
            if (message.data) {
              setRecentReactions(prev => [message.data, ...prev].slice(0, 50));
            }
          } else if (message.type === 'question') {
            // New question received
            if (message.data) {
              setQuestions(prev => [message.data, ...prev]);
            }
          } else if (message.type === 'stats') {
            // Stats update
            if (message.counts) {
              handleReactionUpdate(message.counts);
            }
            if (message.recent_questions) {
              setQuestions(message.recent_questions.reverse());
            }
            if (message.recent_reactions) {
              setRecentReactions(message.recent_reactions.reverse());
            }
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
        
        if (ws.pollInterval) {
          clearInterval(ws.pollInterval);
        }
        
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

  const handleReactionUpdate = (newCounts) => {
    const prevCounts = previousCountsRef.current;
    
    // Check for significant changes and generate alerts
    const speedUpIncrease = newCounts.speed_up - prevCounts.speed_up;
    const slowDownIncrease = newCounts.slow_down - prevCounts.slow_down;
    const showCodeIncrease = newCounts.show_code - prevCounts.show_code;
    const imLostIncrease = newCounts.im_lost - prevCounts.im_lost;
    
    // Alert when "I'm Lost" spikes
    if (imLostIncrease >= 2 && newCounts.im_lost >= 5) {
      addAlert({
        type: "warning",
        message: "⚠️ Audience confusion detected! Consider slowing down.",
        icon: <AlertTriangle className="w-5 h-5" />,
      });
    }
    
    // Alert when "Show Code" is highly requested
    if (showCodeIncrease >= 3 && newCounts.show_code >= 10) {
      addAlert({
        type: "info",
        message: "💻 Strong demand for code examples! Time to show some code?",
        icon: <Zap className="w-5 h-5" />,
      });
    }
    
    // Alert for engagement boost
    if (speedUpIncrease >= 3) {
      addAlert({
        type: "success",
        message: "🚀 Great engagement! Keep up the pace!",
        icon: <TrendingUp className="w-5 h-5" />,
      });
    }
    
    // Alert when slow down requests increase
    if (slowDownIncrease >= 3 && newCounts.slow_down >= 8) {
      addAlert({
        type: "warning",
        message: "🐌 Multiple requests to slow down. Adjust your pace.",
        icon: <AlertCircle className="w-5 h-5" />,
      });
    }
    
    previousCountsRef.current = newCounts;
    setReactionCounts(newCounts);
  };

  const addAlert = (alertData) => {
    const alert = {
      id: `alert-${alertIdCounterRef.current++}`,
      timestamp: Date.now(),
      ...alertData,
    };
    setAlerts(prev => [alert, ...prev].slice(0, 5));
  };

  // Generate heatmap data from recent reactions
  const getHeatmapData = () => {
    const now = Date.now();
    const intervals = 12;
    const intervalSize = 5 * 60 * 1000; // 5 minutes
    
    const data = Array.from({ length: intervals }, (_, i) => {
      const startTime = now - (intervals - i) * intervalSize;
      const endTime = startTime + intervalSize;
      
      const count = recentReactions.filter(r => {
        const timestamp = new Date(r.timestamp).getTime();
        return timestamp >= startTime && timestamp < endTime;
      }).length;
      
      const minutes = (intervals - i) * 5;
      return {
        time: `-${minutes}m`,
        reactions: count,
      };
    });
    
    return data;
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

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/15 to-slate-950 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/12 rounded-full blur-3xl animate-morph" />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/12 rounded-full blur-3xl animate-morph"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-ambient-float" />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md pointer-events-none">
          {alerts.map((alert, idx) => (
            <div
              key={alert.id}
              className={`glass rounded-xl p-4 border backdrop-blur-xl flex items-start gap-3 pointer-events-auto ${
                alert.type === "warning"
                  ? "border-red-500/40 bg-red-500/10"
                  : alert.type === "success"
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-cyan-500/40 bg-cyan-500/10"
              }`}
              style={{ 
                animation: 'float-in-down 0.5s ease-out',
                animationDelay: `${idx * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              <div
                className={
                  alert.type === "warning"
                    ? "text-red-400"
                    : alert.type === "success"
                      ? "text-green-400"
                      : "text-cyan-400"
                }
              >
                {alert.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {alert.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="relative z-20 border-b border-cyan-500/20 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className={mounted ? 'animate-float-in-left' : 'opacity-0'}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${connectionStatus === 'connected' ? 'pulse-ring' : ''} relative`} />
              <span className="text-sm font-medium text-green-400/80">
                {connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">
              Presentation <span className="text-yellow-400">Analytics</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span className="text-sm font-medium text-white/70">Real-time Dashboard</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">{activeConnections}</div>
              <div className="text-xs text-white/50">Viewers</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Analytics grid */}
        <div className={`mb-8 ${mounted ? 'animate-float-in-up' : 'opacity-0'}`}>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {REACTIONS.map((reaction, idx) => {
              const Icon = reaction.icon;
              const count = reactionCounts[reaction.id];
              return (
                <div
                  key={reaction.id}
                  className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 group glow-pulse"
                  style={{
                    animation: "float-in-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                    animationDelay: `${0.1 * idx}s`,
                  }}
                >
                  <div
                    className={`inline-block p-3 rounded-lg bg-gradient-to-br ${reaction.bg} mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className={`w-6 h-6 bg-gradient-to-br ${reaction.color} bg-clip-text text-transparent`} />
                  </div>
                  <p className="text-sm font-medium text-white/60 mb-2">{reaction.label}</p>
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      {count}
                    </p>
                    <p className="text-xs text-white/40 mb-1">reactions</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts section */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Heatmap */}
          <div
            className={`lg:col-span-2 ${mounted ? 'animate-float-in-left' : 'opacity-0'}`}
            style={{ animationDelay: "0.1s" }}
          >
            <div className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 glow-pulse">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Reaction Timeline</h2>
                <p className="text-sm text-white/50">Live audience engagement over time</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getHeatmapData()}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,217,255,0.1)" />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" />
                  <YAxis stroke="rgba(255,255,255,0.3)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f0f1e",
                      border: "1px solid rgba(6,182,212,0.3)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="reactions" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Questions panel */}
          <div className={`${mounted ? 'animate-float-in-right' : 'opacity-0'}`} style={{ animationDelay: "0.2s" }}>
            <div className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 h-full flex flex-col glow-pulse">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Questions</h2>
                <span className="ml-auto text-sm font-semibold text-white/40">{questions.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {questions.length === 0 ? (
                  <p className="text-white/50 text-sm py-8 text-center">Waiting for questions...</p>
                ) : (
                  questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-white/5 rounded-lg p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 group"
                      style={{
                        animation: "float-in-left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                        animationDelay: `${0.05 * idx}s`,
                      }}
                    >
                      <p className="text-white/90 text-sm mb-2 group-hover:text-white transition-colors">{q.text}</p>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(q.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes morph {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes ambient-float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }
        @keyframes float-in-down {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes float-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-morph {
          animation: morph 8s ease-in-out infinite;
        }
        .animate-ambient-float {
          animation: ambient-float 6s ease-in-out infinite;
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
        .glow-pulse {
          animation: glow-pulse 2s ease-in-out infinite;
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.1); }
          50% { box-shadow: 0 0 30px rgba(6, 182, 212, 0.2); }
        }
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
      `}</style>
    </div>
  );
}