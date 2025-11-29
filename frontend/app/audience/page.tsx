"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Volume2, ArrowLeft, Sparkles } from 'lucide-react';
import PollPopup from '@/app/components/PollPopup';
import ReactionButtons from '@/app/components/ReactionButtons';
import ConnectionStatus from '@/app/components/ConnectionStatus';

const WS_BASE_URL = 'ws://localhost:8000/ws';

const REACTIONS = [
  {
    id: "speed_up",
    label: "Speed Up",
    icon: require('lucide-react').RotateCw,
    gradient: "from-blue-500 to-cyan-500",
    color: "rgba(6, 182, 212, 0.8)",
  },
  {
    id: "slow_down",
    label: "Slow Down",
    icon: require('lucide-react').AlertCircle,
    gradient: "from-purple-500 to-pink-500",
    color: "rgba(236, 72, 153, 0.8)",
  },
  {
    id: "show_code",
    label: "Show Code",
    icon: require('lucide-react').Code2,
    gradient: "from-green-500 to-emerald-500",
    color: "rgba(34, 197, 94, 0.8)",
  },
  {
    id: "im_lost",
    label: "I'm Lost",
    icon: require('lucide-react').AlertCircle,
    gradient: "from-orange-500 to-red-500",
    color: "rgba(248, 113, 113, 0.8)",
  },
];

export default function AudiencePage() {
  const [mounted, setMounted] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [recentReaction, setRecentReaction] = useState<string | null>(null);
  const [flyingParticles, setFlyingParticles] = useState<any[]>([]);
  const [flyingEmojis, setFlyingEmojis] = useState<any[]>([]);
  const [reactionCounts, setReactionCounts] = useState({
    speed_up: 0,
    slow_down: 0,
    show_code: 0,
    im_lost: 0,
  });
  const [activePoll, setActivePoll] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [pollVote, setPollVote] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [userId] = useState(`user_${Math.random().toString(36).substr(2, 9)}`);
  const [userUpvotes, setUserUpvotes] = useState(new Set<string>());
  
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const questionsEndRef = useRef<HTMLDivElement>(null);

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
    questionsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [questions]);

  const connectWebSocket = () => {
    if (!roomCode) return;

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/${roomCode}`);
      
      ws.onopen = () => {
        console.log(`✅ Connected to Room ${roomCode}`);
        setConnectionStatus('connected');
        ws.send(JSON.stringify({ type: 'get_stats' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            console.log('📡 Connection confirmed');
          } else if (message.type === 'stats') {
            setReactionCounts(message.counts || reactionCounts);
            setQuestions(message.recent_questions || []);
            if (message.active_poll) {
              setActivePoll(message.active_poll);
            }
          } else if (message.type === 'reaction' && message.counts) {
            setReactionCounts(message.counts);
          } else if (message.type === 'question') {
            const newQuestion = {
              id: message.data?.id || `q-${Date.now()}`,
              text: message.data?.text || message.text,
              timestamp: message.data?.timestamp || Date.now(),
              upvotes: message.data?.upvotes || 0,
              verified: false,
            };
            setQuestions(prev => {
              const exists = prev.find((q: any) => q.id === newQuestion.id);
              if (exists) return prev;
              return [newQuestion, ...prev];
            });
          } else if (message.type === 'question_upvote' && message.data) {
            setQuestions(prev => prev.map((q: any) => 
              q.id === message.data.id 
                ? { ...q, upvotes: message.data.upvotes }
                : q
            ));
          } else if (message.type === 'poll_created' && message.data) {
            console.log('📊 Poll created:', message.data);
            setActivePoll(message.data);
            setHasVoted(false);
            setPollVote(null);
          } else if (message.type === 'poll_vote' && message.data) {
            console.log('📊 Poll vote received:', message.data);
            setActivePoll(message.data);
          } else if (message.type === 'poll_closed' && message.data) {
            console.log('📊 Poll closed:', message.data);
            if (activePoll?.id === message.data.id) {
              setActivePoll(message.data);
              setTimeout(() => {
                setActivePoll(null);
                setHasVoted(false);
                setPollVote(null);
              }, 5000);
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

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected');
      return false;
    }
  };

  const handleReaction = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const sent = sendMessage({
      type: 'reaction',
      reaction: id,
      user_id: userId,
    });

    if (!sent) return;

    setRecentReaction(id);
    setReactionCounts(prev => ({
      ...prev,
      [id]: prev[id as keyof typeof prev] + 1,
    }));

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

      const reaction = REACTIONS.find(r => r.id === id);
      const emoji = {
        id: `emoji-${Date.now()}`,
        x: centerX,
        y: centerY,
        icon: reaction?.icon,
        color: reaction?.gradient,
      };
      setFlyingEmojis(prev => [...prev, emoji]);

      setTimeout(() => {
        setFlyingParticles(prev => 
          prev.filter(p => !p.id.startsWith(`${id}-${Date.now()}`))
        );
      }, 1200);

      setTimeout(() => {
        setFlyingEmojis(prev => prev.filter(e => e.id !== emoji.id));
      }, 2000);
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

  const handlePollVote = (vote: string) => {
    if (!activePoll || hasVoted) return;
    
    const sent = sendMessage({
      type: 'vote_poll',
      poll_id: activePoll.id,
      user_id: userId,
      vote: vote,
    });

    if (sent) {
      setHasVoted(true);
      setPollVote(vote);
      
      setTimeout(() => {
        setActivePoll(null);
        setHasVoted(false);
        setPollVote(null);
      }, 3000);
    }
  };

  const handleUpvote = (questionId: string) => {
    if (userUpvotes.has(questionId)) return;
    
    const sent = sendMessage({
      type: 'upvote_question',
      question_id: questionId,
      user_id: userId,
    });

    if (sent) {
      setUserUpvotes(prev => new Set([...prev, questionId]));
      setQuestions(prev => prev.map((q: any) => 
        q.id === questionId 
          ? { ...q, upvotes: (q.upvotes || 0) + 1 }
          : q
      ));
    }
  };

  const handleLeave = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    window.location.href = '/';
  };

  if (!roomCode) return null;

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/10 to-slate-950 flex flex-col px-4 overflow-hidden"
    >
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-morph" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-morph" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-indigo-500/12 rounded-full blur-3xl animate-ambient-float" />
      </div>

      {/* Flying particles */}
      {flyingParticles.map((particle) => {
        const tx = Math.cos(particle.angle) * particle.distance;
        const ty = Math.sin(particle.angle) * particle.distance;
        return (
          <div
            key={particle.id}
            className="fixed w-3 h-3 rounded-full pointer-events-none z-50"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              background: particle.color,
              animation: 'particle-float 1.2s ease-out forwards',
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
            } as React.CSSProperties}
          />
        );
      })}

      {/* Flying emojis */}
      {flyingEmojis.map((emoji) => {
        const EmojiIcon = emoji.icon;
        return (
          <div
            key={emoji.id}
            className="fixed pointer-events-none z-50"
            style={{
              left: `${emoji.x}px`,
              top: `${emoji.y}px`,
              animation: 'emoji-to-presenter 2s ease-out forwards',
            }}
          >
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${emoji.color} flex items-center justify-center shadow-lg`}>
              {EmojiIcon && <EmojiIcon className="w-6 h-6 text-white" />}
            </div>
          </div>
        );
      })}

      {/* Main content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto py-6 flex flex-col h-screen">
        {/* Header */}
        <div className={`mb-8 text-center ${mounted ? 'animate-float-in-down' : 'opacity-0'}`}>
          <button
            onClick={handleLeave}
            className="mb-4 flex items-center gap-2 text-white/60 hover:text-white transition-colors mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Leave Room</span>
          </button>

          <ConnectionStatus status={connectionStatus} roomCode={roomCode} />

          <h1 className="text-5xl font-bold text-white mb-3 mt-4 text-balance">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient-shift">
              Share Your <span className="text-accent-yellow-glow">Feedback</span>
            </span>
          </h1>
          <p className="text-lg text-white/50">
            Help shape this presentation <span className="text-accent-yellow">in real-time</span>
          </p>
        </div>

        {/* Main grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
          {/* Reactions section */}
          <div className={`lg:col-span-2 glass rounded-2xl p-8 border border-cyan-500/20 flex flex-col ${mounted ? 'animate-float-in-up' : 'opacity-0'}`}>
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Quick Reaction
            </h2>
            <ReactionButtons
              reactions={REACTIONS}
              reactionCounts={reactionCounts}
              recentReaction={recentReaction}
              onReaction={handleReaction}
              isConnected={connectionStatus === 'connected'}
              mounted={mounted}
            />
          </div>

          {/* Questions section */}
          <div className={`glass rounded-2xl p-6 border border-cyan-500/20 flex flex-col overflow-hidden ${mounted ? 'animate-float-in-right' : 'opacity-0'}`}>
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
                [...questions]
                  .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
                  .map((q, idx) => {
                    const hasUpvoted = userUpvotes.has(q.id);
                    const upvoteCount = q.upvotes || 0;
                    return (
                      <div
                        key={q.id}
                        className="glass rounded-lg p-3 border border-cyan-500/10 hover:border-cyan-500/30 transition-all duration-300 group"
                        style={{
                          animationName: "slide-in-up",
                          animationDuration: "0.5s",
                          animationTimingFunction: "ease-out",
                          animationDelay: `${idx * 0.05}s`,
                          animationFillMode: "both",
                        }}
                      >
                        <p className="text-sm text-white/80 line-clamp-2 group-hover:text-white transition-colors mb-2">
                          {q.text}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/40">
                            {new Date(q.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <button
                            onClick={() => handleUpvote(q.id)}
                            disabled={hasUpvoted || connectionStatus !== 'connected'}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                              hasUpvoted
                                ? 'bg-cyan-500/20 text-cyan-400 cursor-not-allowed'
                                : 'bg-white/5 text-white/60 hover:bg-cyan-500/20 hover:text-cyan-400 hover:scale-105 active:scale-95'
                            }`}
                          >
                            <svg 
                              className={`w-3.5 h-3.5 transition-transform ${hasUpvoted ? 'scale-110' : ''}`}
                              fill={hasUpvoted ? 'currentColor' : 'none'}
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            <span className={hasUpvoted ? 'font-bold' : ''}>{upvoteCount}</span>
                          </button>
                        </div>
                        
                        {upvoteCount >= 5 && (
                          <div className="mt-2 pt-2 border-t border-cyan-500/10">
                            <span className="text-xs text-yellow-400 flex items-center gap-1">
                              🔥 Hot question
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
              <div ref={questionsEndRef} />
            </div>

            {/* Ask question input */}
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

        {/* Total reactions */}
        <div className={`mt-8 text-center text-sm text-white/40 ${mounted ? 'animate-float-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
          <p>
            Total reactions:{" "}
            <span className="text-accent-yellow font-bold">
              {Object.values(reactionCounts).reduce((a, b) => a + b, 0)}
            </span>
          </p>
        </div>
      </div>

      {/* Poll Popup */}
      <PollPopup
        activePoll={activePoll}
        hasVoted={hasVoted}
        pollVote={pollVote}
        onVote={handlePollVote}
      />
    </div>
  );
}