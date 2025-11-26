"use client"

import { MessageSquare, Clock } from "lucide-react"

interface Question {
  id: number
  text: string
  timestamp: string
  user_id: string
}

export default function QuestionsPanel({ questions }: { questions: Question[] }) {
  return (
    <div className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 h-full flex flex-col glow-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Questions</h2>
        <span className="ml-auto text-sm font-semibold text-white/40">{questions.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {questions.length === 0 ? (
          <p className="text-white/50 text-sm py-8 text-center">Waiting for questions...</p>
        ) : (
          questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white/5 rounded-lg p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 group"
              style={{
                animation: "float-in-left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                animationDelay: `${0.05 * idx}s`,
              }}
            >
              <p className="text-white/90 text-sm mb-2 group-hover:text-white transition-colors">{q.text}</p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Clock className="w-3 h-3" />
                <span>{new Date(q.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
