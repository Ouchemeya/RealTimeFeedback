"use client"

import React from 'react';
import { Activity } from 'lucide-react';

interface Participant {
  id: string;
  initials: string;
  color: string;
  lastActive: number;
  pulseUntil: number;
}

interface ParticipantAvatarsProps {
  participants: Participant[];
  mounted: boolean;
}

export default function ParticipantAvatars({ participants, mounted }: ParticipantAvatarsProps) {
  if (participants.length === 0) return null;

  return (
    <div className={`${mounted ? 'animate-float-in-up' : 'opacity-0'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
          Live Participants
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {participants.map((participant, idx) => {
          const isPulsing = Date.now() < participant.pulseUntil;
          return (
            <div
              key={participant.id}
              className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${participant.color} flex items-center justify-center text-white text-xs font-bold border-2 border-white/20 transition-all duration-300 ${
                isPulsing ? 'scale-110 animate-pulse-once' : ''
              }`}
              style={{ animation: `float-in-scale 0.5s ease-out ${idx * 0.05}s both` }}
            >
              {participant.initials}
              {isPulsing && (
                <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}