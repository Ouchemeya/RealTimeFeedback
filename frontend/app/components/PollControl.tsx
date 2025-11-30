import { BarChart3, X, ThumbsUp, ThumbsDown, Send } from "lucide-react"

interface PollControlProps {
  activePoll: any
  pollText: string
  setPollText: (text: string) => void
  onCreatePoll: () => void
  onEndPoll: () => void
  isConnected: boolean
}

export default function PollControl({
  activePoll,
  pollText,
  setPollText,
  onCreatePoll,
  onEndPoll,
  isConnected,
}: PollControlProps) {
  const totalVotes = (activePoll?.yes_votes || 0) + (activePoll?.no_votes || 0)
  const yesPercentage = totalVotes > 0 ? ((activePoll?.yes_votes || 0) / totalVotes) * 100 : 0
  const noPercentage = totalVotes > 0 ? ((activePoll?.no_votes || 0) / totalVotes) * 100 : 0

  return (
    <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/5 via-white/5 to-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-gradient-to-br from-poll-cyan/20 to-poll-purple/20 rounded-lg border border-white/20">
          <BarChart3 className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white">Quick Poll</h3>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-poll-success/20 rounded-full border border-poll-success/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-poll-success opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-poll-success" />
            </span>
            <span className="text-xs font-bold text-poll-success-light">Live</span>
          </div>
        )}
      </div>

      {!activePoll || !activePoll.active ? (
        <div className="space-y-3">
          {/* Input field */}
          <div className="relative">
            <input
              type="text"
              value={pollText}
              onChange={(e) => setPollText(e.target.value)}
              placeholder="Ask your audience..."
              maxLength={150}
              className="w-full bg-white/5 border border-white/20 text-white placeholder-white/30 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-poll-cyan/50 focus:ring-1 focus:ring-poll-cyan/20 transition-all duration-300"
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium ${pollText.length > 130 ? 'text-poll-error' : 'text-white/30'}`}>
              {pollText.length}/150
            </span>
          </div>

          {/* Launch button */}
          <button
            onClick={onCreatePoll}
            disabled={!pollText.trim() || !isConnected}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-bold text-xs text-white transition-all duration-300 ${
              !pollText.trim() || !isConnected
                ? 'bg-white/10 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-poll-purple to-poll-pink hover:shadow-lg hover:shadow-poll-pink/20 active:scale-95'
            }`}
          >
            {!pollText.trim() || !isConnected ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>{!isConnected ? 'Not Connected' : 'Enter Question'}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Launch • 30s</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active poll badge */}
          <div className="relative bg-gradient-to-r from-poll-purple/20 to-poll-pink/20 border border-poll-purple/40 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-bold text-poll-purple tracking-wider">ACTIVE</span>
              <button
                onClick={onEndPoll}
                className="p-1 hover:bg-poll-error/20 rounded transition-all duration-300"
                title="End poll"
              >
                <X className="w-3 h-3 text-white/60 hover:text-poll-error" />
              </button>
            </div>
            <p className="text-white text-xs font-semibold leading-relaxed">{activePoll.text}</p>
          </div>

          {/* Results visualization */}
          <div className="space-y-2.5 bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-white/50 tracking-wider">RESULTS</span>
              <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-full">
                <BarChart3 className="w-3 h-3 text-poll-cyan" />
                <span className="text-xs font-bold text-white">{totalVotes}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-poll-success/20 border border-poll-success/40 flex items-center justify-center flex-shrink-0">
                  <ThumbsUp className="w-3.5 h-3.5 text-poll-success-light" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/60 font-bold">YES</span>
                    <span className="text-xs font-bold text-poll-success-light">{activePoll.yes_votes || 0}</span>
                  </div>
                  <div className="h-4 bg-white/5 rounded-lg overflow-hidden border border-poll-success/20">
                    <div
                      className="h-full bg-gradient-to-r from-poll-success to-poll-success-light transition-all duration-700 flex items-center justify-end px-2"
                      style={{ width: `${yesPercentage}%` }}
                    >
                      {yesPercentage > 25 && (
                        <span className="text-white text-[10px] font-bold">
                          {Math.round(yesPercentage)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-poll-error/20 border border-poll-error/40 flex items-center justify-center flex-shrink-0">
                  <ThumbsDown className="w-3.5 h-3.5 text-poll-error-light" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/60 font-bold">NO</span>
                    <span className="text-xs font-bold text-poll-error-light">{activePoll.no_votes || 0}</span>
                  </div>
                  <div className="h-4 bg-white/5 rounded-lg overflow-hidden border border-poll-error/20">
                    <div
                      className="h-full bg-gradient-to-r from-poll-error to-poll-error-light transition-all duration-700 flex items-center justify-end px-2"
                      style={{ width: `${noPercentage}%` }}
                    >
                      {noPercentage > 25 && (
                        <span className="text-white text-[10px] font-bold">
                          {Math.round(noPercentage)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}