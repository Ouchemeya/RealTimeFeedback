"use client"

import { RotateCw, Code2, AlertCircle, TrendingDown } from "lucide-react"

interface ReactionCounts {
  speed_up: number
  slow_down: number
  show_code: number
  im_lost: number
}

const REACTIONS = [
  {
    id: "speed_up",
    label: "Speed Up",
    icon: RotateCw,
    color: "from-blue-500 to-cyan-500",
    bg: "from-blue-500/10 to-cyan-500/10",
  },
  {
    id: "slow_down",
    label: "Slow Down",
    icon: AlertCircle,
    color: "from-purple-500 to-pink-500",
    bg: "from-purple-500/10 to-pink-500/10",
  },
  {
    id: "show_code",
    label: "Show Code",
    icon: Code2,
    color: "from-green-500 to-emerald-500",
    bg: "from-green-500/10 to-emerald-500/10",
  },
  {
    id: "im_lost",
    label: "I'm Lost",
    icon: TrendingDown,
    color: "from-orange-500 to-red-500",
    bg: "from-orange-500/10 to-red-500/10",
  },
]

export default function AnalyticsGrid({ reactionCounts }: { reactionCounts: ReactionCounts }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {REACTIONS.map((reaction, idx) => {
        const Icon = reaction.icon
        const count = reactionCounts[reaction.id as keyof ReactionCounts]
        return (
          <div
            key={reaction.id}
            className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 group glow-pulse"
            style={{
              animation: "float-in-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
              animationDelay: `${0.1 * idx}s`,
            }}
          >
            <div
              className={`inline-block p-3 rounded-lg bg-gradient-to-br ${reaction.bg} mb-4 group-hover:scale-110 transition-transform duration-300`}
            >
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
        )
      })}
    </div>
  )
}
