"use client"

import React from 'react';

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  roomCode: string;
}

export default function ConnectionStatus({ status, roomCode }: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-400';
      case 'connecting': return 'bg-yellow-400';
      case 'disconnected': return 'bg-orange-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Live • Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Reconnecting...';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-cyan-500/30 rounded-full backdrop-blur-sm hover:border-cyan-500/60 transition-colors duration-300">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} relative ${status === 'connected' ? 'pulse-ring' : ''}`} />
      <span className="text-xs font-medium text-white/70">{getStatusText()}</span>
      <span className="text-xs text-white/40">•</span>
      <span className="text-xs font-mono font-bold text-cyan-400">Room {roomCode}</span>
    </div>
  );
}