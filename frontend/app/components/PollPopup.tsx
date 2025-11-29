"use client"

import React from 'react';

interface PollPopupProps {
  activePoll: any;
  hasVoted: boolean;
  pollVote: string | null;
  onVote: (vote: string) => void;
}

export default function PollPopup({ activePoll, hasVoted, pollVote, onVote }: PollPopupProps) {
  if (!activePoll || !activePoll.active) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md glass rounded-3xl p-8 border-2 border-cyan-500/40 shadow-2xl shadow-cyan-500/20 animate-scale-in">
        {/* Timer Ring */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
              <circle
                cx="32" cy="32" r="28"
                className="stroke-cyan-400"
                strokeWidth="4"
                fill="none"
                strokeDasharray={2 * Math.PI * 28}
                strokeLinecap="round"
                style={{ 
                  animation: `countdown ${activePoll.duration}s linear forwards`,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white">⏱️</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-6 mt-4">
          <h3 className="text-2xl font-bold text-white mb-2">Quick Poll!</h3>
          <p className="text-white/70 text-sm line-clamp-3">{activePoll.text}</p>
        </div>

        {!hasVoted ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onVote('yes')}
              className="group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-green-500/50"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative text-center">
                <div className="text-6xl mb-3">👍</div>
                <p className="text-white font-bold text-lg">Yes</p>
              </div>
            </button>

            <button
              onClick={() => onVote('no')}
              className="group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-500/50"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative text-center">
                <div className="text-6xl mb-3">👎</div>
                <p className="text-white font-bold text-lg">No</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-5xl mb-3 animate-bounce">
                {pollVote === 'yes' ? '👍' : '👎'}
              </div>
              <p className="text-cyan-400 font-bold">Vote recorded!</p>
              <p className="text-white/60 text-sm mt-1">Waiting for results...</p>
            </div>

            {/* Live Results Preview */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👍</span>
                <div className="flex-1 h-8 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 flex items-center justify-end px-3"
                    style={{ 
                      width: `${(activePoll.yes_votes || 0) + (activePoll.no_votes || 0) > 0 
                        ? ((activePoll.yes_votes || 0) / ((activePoll.yes_votes || 0) + (activePoll.no_votes || 0))) * 100 
                        : 0}%` 
                    }}
                  >
                    <span className="text-white text-sm font-bold">{activePoll.yes_votes || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl">👎</span>
                <div className="flex-1 h-8 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-500 flex items-center justify-end px-3"
                    style={{ 
                      width: `${(activePoll.yes_votes || 0) + (activePoll.no_votes || 0) > 0 
                        ? ((activePoll.no_votes || 0) / ((activePoll.yes_votes || 0) + (activePoll.no_votes || 0))) * 100 
                        : 0}%` 
                    }}
                  >
                    <span className="text-white text-sm font-bold">{activePoll.no_votes || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}