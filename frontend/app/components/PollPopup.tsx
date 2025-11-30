"use client"

import { ThumbsUp, ThumbsDown, Clock, Check } from "lucide-react"

interface PollPopupProps {
  activePoll: any
  hasVoted: boolean
  pollVote: string | null
  onVote: (vote: string) => void
}

export default function PollPopup({ activePoll, hasVoted, pollVote, onVote }: PollPopupProps) {
  if (!activePoll || !activePoll.active) return null

  const totalVotes = (activePoll.yes_votes || 0) + (activePoll.no_votes || 0)
  const yesPercentage = totalVotes > 0 ? ((activePoll.yes_votes || 0) / totalVotes) * 100 : 0
  const noPercentage = totalVotes > 0 ? ((activePoll.no_votes || 0) / totalVotes) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0A0E27]/95 backdrop-blur-xl" />
      
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-2xl animate-scale-in">
        {/* Main card */}
        <div className="relative bg-gradient-to-br from-[#1a1f3a] to-[#141829] rounded-[32px] border border-white/10 shadow-2xl overflow-hidden">
          
          {/* Timer - floating top */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/20">
              <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span className="text-sm font-bold text-white">{Math.ceil(activePoll.duration)}s</span>
            </div>
          </div>

          {/* Header */}
          <div className="relative pt-12 pb-8 px-10 text-center border-b border-white/5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Live</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-3 leading-tight">
              {activePoll.text}
            </h3>
            <p className="text-sm text-gray-400 font-medium">
              {hasVoted ? `${totalVotes} responses collected` : 'Your response matters'}
            </p>
          </div>

          {!hasVoted ? (
            <div className="p-8">
              {/* Voting buttons */}
              <div className="grid grid-cols-2 gap-5 mb-8">
                <button
                  onClick={() => onVote("yes")}
                  className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-3xl p-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-emerald-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex flex-col items-center gap-4 text-white">
                    <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                      <ThumbsUp className="w-8 h-8" strokeWidth={2} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg mb-1">Approve</p>
                      <p className="text-sm text-white/70">{activePoll.yes_votes || 0} votes</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => onVote("no")}
                  className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 rounded-3xl p-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-rose-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex flex-col items-center gap-4 text-white">
                    <div className="w-16 h-16 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                      <ThumbsDown className="w-8 h-8" strokeWidth={2} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg mb-1">Reject</p>
                      <p className="text-sm text-white/70">{activePoll.no_votes || 0} votes</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Live results preview */}
              {totalVotes > 0 && (
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Results</span>
                    <span className="text-sm font-medium text-white">{totalVotes} votes</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ThumbsUp className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 ease-out rounded-full"
                            style={{ width: `${yesPercentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white min-w-[3rem] text-right">
                        {Math.round(yesPercentage)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ThumbsDown className="w-5 h-5 text-rose-400" strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700 ease-out rounded-full"
                            style={{ width: `${noPercentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white min-w-[3rem] text-right">
                        {Math.round(noPercentage)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10">
              {/* Vote confirmation */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative">
                  <div className={`absolute inset-0 rounded-full blur-xl ${pollVote === "yes" ? "bg-emerald-500/40" : "bg-rose-500/40"}`} />
                  <div className={`relative w-full h-full rounded-full flex items-center justify-center ${
                    pollVote === "yes" 
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
                      : "bg-gradient-to-br from-rose-500 to-pink-600"
                  }`}>
                    {pollVote === "yes" ? (
                      <ThumbsUp className="w-12 h-12 text-white" strokeWidth={2} />
                    ) : (
                      <ThumbsDown className="w-12 h-12 text-white" strokeWidth={2} />
                    )}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
                    </div>
                  </div>
                </div>
                <h4 className="text-2xl font-bold text-white mb-2">Vote Recorded</h4>
                <p className="text-sm text-gray-400">Thank you for your response</p>
              </div>

              {/* Final results */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-7 border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Final Results</span>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                    <span className="text-sm font-bold text-white">{totalVotes}</span>
                    <span className="text-xs text-gray-400">total</span>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                          <ThumbsUp className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                        </div>
                        <span className="text-sm font-medium text-gray-300">Approve</span>
                      </div>
                      <span className="text-lg font-bold text-white">{activePoll.yes_votes || 0}</span>
                    </div>
                    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${yesPercentage}%` }}
                      />
                      {yesPercentage > 15 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                          {Math.round(yesPercentage)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center justify-center">
                          <ThumbsDown className="w-5 h-5 text-rose-400" strokeWidth={2} />
                        </div>
                        <span className="text-sm font-medium text-gray-300">Reject</span>
                      </div>
                      <span className="text-lg font-bold text-white">{activePoll.no_votes || 0}</span>
                    </div>
                    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${noPercentage}%` }}
                      />
                      {noPercentage > 15 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                          {Math.round(noPercentage)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}