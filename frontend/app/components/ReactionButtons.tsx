"use client"

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Reaction {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  color: string;
}

interface ReactionButtonsProps {
  reactions: Reaction[];
  reactionCounts: Record<string, number>;
  recentReaction: string | null;
  onReaction: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  isConnected: boolean;
  mounted: boolean;
}

export default function ReactionButtons({
  reactions,
  reactionCounts,
  recentReaction,
  onReaction,
  isConnected,
  mounted
}: ReactionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {reactions.map((reaction, idx) => {
        const Icon = reaction.icon;
        const isActive = recentReaction === reaction.id;
        const count = reactionCounts[reaction.id as keyof typeof reactionCounts];
        
        return (
          <button
            key={reaction.id}
            onClick={(e) => onReaction(reaction.id, e)}
            disabled={!isConnected}
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
                className={`w-8 h-8 mx-auto mb-2 transition-transform ${
                  isActive ? 'scale-125 animate-rotate-in' : 'group-hover:scale-110'
                }`}
              />
              <p className="font-semibold text-sm">{reaction.label}</p>
              {count > 0 && (
                <div className="text-xs text-white/70 mt-1 font-medium animate-scale-in">
                  {count}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}