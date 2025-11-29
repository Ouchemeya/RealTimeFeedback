"use client"

import React from 'react';

interface PollControlProps {
  activePoll: any;
  pollText: string;
  setPollText: (text: string) => void;
  onCreatePoll: () => void;
  onEndPoll: () => void;
  isConnected: boolean;
}

export default function PollControl({
  activePoll,
  pollText,
  setPollText,
  onCreatePoll,
  onEndPoll,
  isConnected
}: PollControlProps) {
  return (
    <div className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 flex flex-col glow-pulse mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Live Poll</h2>
      </div>

      {!activePoll || !activePoll.active ? (
        <div>
          <input
            type="text"
            value={pollText}
            onChange={(e) => setPollText(e.target.value)}
            placeholder="Enter your poll question..."
            className="w-full bg-white/5 border border-cyan-500/20 text-white placeholder-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm mb-4"
          />
          <button
            onClick={onCreatePoll}
            disabled={!pollText.trim() || !isConnected}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>📊</span>
            <span>Launch Poll (30s)</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-purple-400 uppercase flex items-center gap-1">
                <span className="animate-pulse">📊</span> Active Poll
              </span>
              <button
                onClick={onEndPoll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                End Poll
              </button>
            </div>
            <p className="text-white text-sm font-medium">{activePoll.text}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👍</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60">Yes</span>
                  <span className="text-sm font-bold text-green-400">
                    {activePoll.yes_votes || 0}
                  </span>
                </div>
                <div className="h-8 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 flex items-center justify-end px-3"
                    style={{ 
                      width: `${(activePoll.yes_votes || 0) + (activePoll.no_votes || 0) > 0 
                        ? ((activePoll.yes_votes || 0) / ((activePoll.yes_votes || 0) + (activePoll.no_votes || 0))) * 100 
                        : 0}%` 
                    }}
                  >
                    <span className="text-white text-xs font-bold">
                      {(activePoll.yes_votes || 0) + (activePoll.no_votes || 0) > 0 
                        ? Math.round(((activePoll.yes_votes || 0) / ((activePoll.yes_votes || 0) + (activePoll.no_votes || 0))) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl">👎</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/60">No</span>
                  <span className="text-sm font-bold text-red-400">
                    {activePoll.no_votes || 0}
                  </span>
                </div>
                <div className="h-8 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-500 flex items-center justify-end px-3"
                    style={{ 
                      width: `${(activePoll.yes_votes || 0) + (activePoll.no_votes || 0) > 0 
                        ? ((activePoll.no_votes || 0) / ((activePoll.yes_votes || 0) + (activePoll.no_votes || 0))) * 100 
                        : 0}%` 
                    }}
                  >
                    <span className="text-white text-xs font-bold">
                      {(activePoll.yes_votes || 0) + (activePoll.no_votes || 0) > 0 
                        ? Math.round(((activePoll.no_votes || 0) / ((activePoll.yes_votes || 0) + (activePoll.no_votes || 0))) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-purple-500/20">
              <span className="text-xs text-white/40">
                Total votes: <span className="font-bold text-purple-400">
                  {(activePoll.yes_votes || 0) + (activePoll.no_votes || 0)}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}