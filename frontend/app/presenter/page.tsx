"use client"

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, TrendingUp, Zap, RotateCw, Code2, AlertCircle, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ParticipantAvatars from '@/app/components/ParticipantAvatars';
import EngagementScore from '@/app/components/EngagementScore';
import PollControl from '@/app/components/PollControl';
import QuestionList from '@/app/components/QuestionList';

const WS_BASE_URL = 'ws://localhost:8000/ws';

const REACTIONS = [
  {
    id: "speed_up",
    label: "Speed Up",
    icon: RotateCw,
    color: "from-blue-500 to-cyan-500",
    bg: "from-blue-500/10 to-cyan-500/10",
    waveColor: "rgba(6, 182, 212, 0.8)",
  },
  {
    id: "slow_down",
    label: "Slow Down",
    icon: AlertCircle,
    color: "from-purple-500 to-pink-500",
    bg: "from-purple-500/10 to-pink-500/10",
    waveColor: "rgba(236, 72, 153, 0.8)",
  },
  {
    id: "show_code",
    label: "Show Code",
    icon: Code2,
    color: "from-green-500 to-emerald-500",
    bg: "from-green-500/10 to-emerald-500/10",
    waveColor: "rgba(34, 197, 94, 0.8)",
  },
  {
    id: "im_lost",
    label: "I'm Lost",
    icon: AlertCircle,
    color: "from-orange-500 to-red-500",
    bg: "from-orange-500/10 to-red-500/10",
    waveColor: "rgba(248, 113, 113, 0.8)",
  },
];

export default function PresenterDashboard() {
  const [mounted, setMounted] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reactionCounts, setReactionCounts] = useState({
    speed_up: 0,
    slow_down: 0,
    show_code: 0,
    im_lost: 0,
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [recentReactions, setRecentReactions] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [activeConnections, setActiveConnections] = useState(0);
  const [reactionWaves, setReactionWaves] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [flyingEmojis, setFlyingEmojis] = useState<any[]>([]);
  const [activePoll, setActivePoll] = useState<any>(null);
  const [pollText, setPollText] = useState("");
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const alertIdCounterRef = useRef(0);
  const previousCountsRef = useRef({ speed_up: 0, slow_down: 0, show_code: 0, im_lost: 0 });
  const waveIdCounterRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    
    if (room) {
      setRoomCode(room.toUpperCase());
    } else {
      window.location.href = '/';
    }
  }, []);

  const connectWebSocket = () => {
    if (!roomCode) return;

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/${roomCode}`);
      
      ws.onopen = () => {
        console.log(`✅ Presenter connected to room ${roomCode}`);
        setConnectionStatus('connected');
        ws.send(JSON.stringify({ type: 'get_stats' }));
        
        const pollInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'get_stats' }));
          }
        }, 5000);
        
        (ws as any).pollInterval = pollInterval;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            console.log('📡 Connection confirmed');
          } else if (message.type === 'reaction') {
            if (message.counts) {
              handleReactionUpdate(message.counts);
            }
            if (message.data) {
              setRecentReactions(prev => [message.data, ...prev].slice(0, 50));
              if (message.data.user_id) {
                addParticipant(message.data.user_id);
              }
              createFlyingEmoji(message.data.type);
            }
          } else if (message.type === 'question') {
            if (message.data) {
              setQuestions(prev => {
                const exists = prev.find((q: any) => q.id === message.data.id);
                if (exists) return prev;
                return [message.data, ...prev];
              });
              if (message.data.user_id) {
                addParticipant(message.data.user_id);
              }
            }
          } else if (message.type === 'question_upvote' && message.data) {
            setQuestions(prev => prev.map((q: any) => 
              q.id === message.data.id 
                ? { ...q, upvotes: message.data.upvotes }
                : q
            ));
          } else if (message.type === 'poll_created' && message.data) {
            setActivePoll(message.data);
          } else if (message.type === 'poll_vote' && message.data) {
            setActivePoll(message.data);
          } else if (message.type === 'poll_closed' && message.data) {
            if (activePoll?.id === message.data.id) {
              setActivePoll(message.data);
              setTimeout(() => {
                setActivePoll(null);
              }, 5000);
            }
          } else if (message.type === 'stats') {
            if (message.counts) {
              handleReactionUpdate(message.counts);
            }
            setActiveConnections(message.active_connections || 0);
            if (message.recent_questions) {
              setQuestions(message.recent_questions.reverse());
            }
            if (message.recent_reactions) {
              setRecentReactions(message.recent_reactions.reverse());
              message.recent_reactions.forEach((r: any) => {
                if (r.user_id) addParticipant(r.user_id);
              });
            }
            if (message.active_poll) {
              setActivePoll(message.active_poll);
            }
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('🔌 Disconnected from feedback system');
        setConnectionStatus('disconnected');
        
        if ((ws as any).pollInterval) {
          clearInterval((ws as any).pollInterval);
        }
        
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

  useEffect(() => {
    if (roomCode) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [roomCode]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setTimeout(() => {
      setAlerts(prev => prev.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [alerts]);

  const handleReactionUpdate = (newCounts: any) => {
    const prevCounts = previousCountsRef.current;
    
    const speedUpIncrease = newCounts.speed_up - prevCounts.speed_up;
    const slowDownIncrease = newCounts.slow_down - prevCounts.slow_down;
    const showCodeIncrease = newCounts.show_code - prevCounts.show_code;
    const imLostIncrease = newCounts.im_lost - prevCounts.im_lost;
    
    if (speedUpIncrease > 0) createReactionWave('speed_up', speedUpIncrease);
    if (slowDownIncrease > 0) createReactionWave('slow_down', slowDownIncrease);
    if (showCodeIncrease > 0) createReactionWave('show_code', showCodeIncrease);
    if (imLostIncrease > 0) createReactionWave('im_lost', imLostIncrease);
    
    if (imLostIncrease >= 2 && newCounts.im_lost >= 5) {
      addAlert({
        type: "warning",
        message: "⚠️ Audience confusion detected! Consider slowing down.",
        icon: <AlertTriangle className="w-5 h-5" />,
      });
    }
    
    if (showCodeIncrease >= 3 && newCounts.show_code >= 10) {
      addAlert({
        type: "info",
        message: "💻 Strong demand for code examples! Time to show some code?",
        icon: <Zap className="w-5 h-5" />,
      });
    }
    
    if (speedUpIncrease >= 3) {
      addAlert({
        type: "success",
        message: "🚀 Great engagement! Keep up the pace!",
        icon: <TrendingUp className="w-5 h-5" />,
      });
    }
    
    if (slowDownIncrease >= 3 && newCounts.slow_down >= 8) {
      addAlert({
        type: "warning",
        message: "🌊 Multiple requests to slow down. Adjust your pace.",
        icon: <AlertCircle className="w-5 h-5" />,
      });
    }
    
    previousCountsRef.current = newCounts;
    setReactionCounts(newCounts);
  };

  const addAlert = (alertData: any) => {
    const alert = {
      id: `alert-${alertIdCounterRef.current++}`,
      timestamp: Date.now(),
      ...alertData,
    };
    setAlerts(prev => [alert, ...prev].slice(0, 5));
  };

  const createReactionWave = (reactionType: string, count: number) => {
    const reaction = REACTIONS.find(r => r.id === reactionType);
    if (!reaction) return;
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const wave = {
        id: `wave-${waveIdCounterRef.current++}`,
        color: reaction.waveColor,
        delay: i * 150,
      };
      
      setReactionWaves(prev => [...prev, wave]);
      
      setTimeout(() => {
        setReactionWaves(prev => prev.filter(w => w.id !== wave.id));
      }, 3000 + wave.delay);
    }
  };

  const createFlyingEmoji = (reactionType: string) => {
    const reaction = REACTIONS.find(r => r.id === reactionType);
    if (!reaction) return;
    
    const emoji = {
      id: `emoji-${Date.now()}-${Math.random()}`,
      icon: reaction.icon,
      color: reaction.color,
      startX: Math.random() * window.innerWidth,
      startY: window.innerHeight,
    };
    
    setFlyingEmojis(prev => [...prev, emoji]);
    
    setTimeout(() => {
      setFlyingEmojis(prev => prev.filter(e => e.id !== emoji.id));
    }, 2000);
  };

  const addParticipant = (userId: string) => {
    const initials = userId.slice(-2).toUpperCase();
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-yellow-500',
      'from-red-500 to-rose-500',
      'from-indigo-500 to-violet-500',
    ];
    
    const participant = {
      id: userId,
      initials,
      color: colors[Math.floor(Math.random() * colors.length)],
      lastActive: Date.now(),
      pulseUntil: Date.now() + 2000,
    };
    
    setParticipants(prev => {
      const existing = prev.find(p => p.id === userId);
      if (existing) {
        return prev.map(p => p.id === userId ? { ...p, lastActive: Date.now(), pulseUntil: Date.now() + 2000 } : p);
      }
      return [...prev, participant].slice(-12);
    });
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected');
      return false;
    }
  };

  const handleCreatePoll = () => {
    if (!pollText.trim()) return;
    sendMessage({
      type: 'create_poll',
      text: pollText.trim(),
      duration: 30
    });
    setPollText("");
  };

  const handleEndPoll = () => {
    setActivePoll((prev: any) => prev ? { ...prev, active: false } : null);
    setTimeout(() => setActivePoll(null), 3000);
  };

  const getEngagementScore = () => {
    const total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
    if (total === 0) return 50;
    
    const positive = reactionCounts.speed_up + reactionCounts.show_code;
    const negative = reactionCounts.slow_down + reactionCounts.im_lost * 2;
    
    const score = Math.max(0, Math.min(100, 50 + (positive - negative) * 5));
    return Math.round(score);
  };

  const getHeatmapData = () => {
    const now = Date.now();
    const intervals = 12;
    const intervalSize = 5 * 60 * 1000;
    
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

  const copyToClipboard = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeave = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    window.location.href = '/';
  };

  if (!roomCode) return null;

  const engagementScore = getEngagementScore();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/15 to-slate-950 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/12 rounded-full blur-3xl animate-morph" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/12 rounded-full blur-3xl animate-morph" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-ambient-float" />
      </div>

      {/* Reaction waves */}
      {reactionWaves.map((wave) => (
        <div
          key={wave.id}
          className="fixed bottom-0 left-0 right-0 pointer-events-none z-30"
          style={{
            animation: 'wave-rise 3s ease-out forwards',
            animationDelay: `${wave.delay}ms`,
          }}
        >
          <div className="w-full h-32 opacity-30" style={{ background: `linear-gradient(to top, ${wave.color}, transparent)` }} />
        </div>
      ))}

      {/* Flying emojis */}
      {flyingEmojis.map((emoji) => {
        const EmojiIcon = emoji.icon;
        return (
          <div
            key={emoji.id}
            className="fixed pointer-events-none z-40"
            style={{
              left: `${emoji.startX}px`,
              top: `${emoji.startY}px`,
              animation: 'emoji-to-top 2s ease-out forwards',
            }}
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${emoji.color} flex items-center justify-center shadow-lg`}>
              <EmojiIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        );
      })}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md pointer-events-none">
          {alerts.map((alert, idx) => (
            <div
              key={alert.id}
              className={`glass rounded-xl p-4 border backdrop-blur-xl flex items-start gap-3 pointer-events-auto ${
                alert.type === "warning" ? "border-red-500/40 bg-red-500/10" :
                alert.type === "success" ? "border-green-500/40 bg-green-500/10" :
                "border-cyan-500/40 bg-cyan-500/10"
              }`}
              style={{ 
                animation: 'float-in-down 0.5s ease-out',
                animationDelay: `${idx * 0.1}s`,
                animationFillMode: 'both'
              }}
            >
              <div className={alert.type === "warning" ? "text-red-400" : alert.type === "success" ? "text-green-400" : "text-cyan-400"}>
                {alert.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="relative z-20 border-b border-cyan-500/20 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className={mounted ? 'animate-float-in-left' : 'opacity-0'}>
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Leave Room</span>
              </button>
              
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${connectionStatus === 'connected' ? 'pulse-ring' : ''} relative`} />
                <span className="text-sm font-medium text-green-400/80">
                  {connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}
                </span>
                <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-white/5 rounded-full border border-cyan-500/30">
                  <span className="text-sm text-white/70">Room:</span>
                  <span className="font-mono font-bold text-cyan-400">{roomCode}</span>
                  <button
                    onClick={copyToClipboard}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Copy code"
                  >
                    {copied ? (
                      <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white">
                Presentation <span className="text-yellow-400">Analytics</span>
              </h1>
            </div>
            
            <EngagementScore 
              score={engagementScore} 
              activeConnections={activeConnections}
              mounted={mounted}
            />
          </div>

          <ParticipantAvatars 
            participants={participants}
            mounted={mounted}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Reaction cards */}
        <div className={`mb-8 ${mounted ? 'animate-float-in-up' : 'opacity-0'}`}>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {REACTIONS.map((reaction, idx) => {
              const Icon = reaction.icon;
              const count = reactionCounts[reaction.id as keyof typeof reactionCounts];
              return (
                <div
                  key={reaction.id}
                  className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 group glow-pulse"
                  style={{
                    animation: "float-in-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                    animationDelay: `${0.1 * idx}s`,
                  }}
                >
                  <div className={`inline-block p-3 rounded-lg bg-gradient-to-br ${reaction.bg} mb-4 group-hover:scale-110 transition-transform duration-300`}>
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

        {/* Chart and questions/poll */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Emotion Wave Timeline */}
          <div
            className={`lg:col-span-2 ${mounted ? 'animate-float-in-left' : 'opacity-0'}`}
            style={{ animationDelay: "0.1s" }}
          >
            <div className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 glow-pulse">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">Emotion Wave Timeline</h2>
                <p className="text-sm text-white/50">Live audience sentiment over time</p>
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

          {/* Right column: Questions + Poll */}
          <div className={`${mounted ? 'animate-float-in-right' : 'opacity-0'}`} style={{ animationDelay: "0.2s" }}>
            <div className="space-y-6">
              {/* Questions Panel */}
              <QuestionList questions={questions} />
              
              {/* Poll Control */}
              <PollControl
                activePoll={activePoll}
                pollText={pollText}
                setPollText={setPollText}
                onCreatePoll={handleCreatePoll}
                onEndPoll={handleEndPoll}
                isConnected={connectionStatus === 'connected'}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}