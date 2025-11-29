"use client"

import React from 'react';

interface EngagementScoreProps {
  score: number;
  activeConnections: number;
  mounted: boolean;
}

export default function EngagementScore({ score, activeConnections, mounted }: EngagementScoreProps) {
  const getEngagementColor = (score: number) => {
    if (score >= 70) return { 
      text: 'text-green-400', 
      ring: 'stroke-green-400', 
      emoji: '🔥',
      label: 'Engaged!'
    };
    if (score >= 40) return { 
      text: 'text-yellow-400', 
      ring: 'stroke-yellow-400', 
      emoji: '👍',
      label: 'Okay'
    };
    return { 
      text: 'text-red-400', 
      ring: 'stroke-red-400', 
      emoji: '❄️',
      label: 'Confused'
    };
  };

  const style = getEngagementColor(score);
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`${mounted ? 'animate-float-in-down' : 'opacity-0'}`}>
      <div className="flex items-center gap-6">
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle 
              cx="64" 
              cy="64" 
              r="56" 
              stroke="rgba(255,255,255,0.1)" 
              strokeWidth="8" 
              fill="none" 
            />
            <circle
              cx="64" 
              cy="64" 
              r="56"
              className={style.ring}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl">{style.emoji}</span>
            <span className={`text-2xl font-bold ${style.text}`}>{score}%</span>
          </div>
        </div>
        <div>
          <div className="text-sm text-white/50 mb-1">Engagement</div>
          <div className={`text-lg font-bold ${style.text}`}>
            {style.label}
          </div>
          <div className="text-xs text-white/40 mt-1">{activeConnections} viewers</div>
        </div>
      </div>
    </div>
  );
}