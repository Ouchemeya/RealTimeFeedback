"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function ReactionHeatmap() {
  const data = Array.from({ length: 12 }, (_, i) => ({
    time: `${String(Math.floor(i * 5)).padStart(2, "0")}:00`,
    reactions: Math.floor(Math.random() * 50) + 10,
  }))

  return (
    <div className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 glow-pulse">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Reaction Timeline</h2>
        <p className="text-sm text-white/50">Live audience engagement over time</p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,217,255,0.1)" />
          <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" />
          <YAxis stroke="rgba(255,255,255,0.3)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f0f1e",
              border: "1px solid rgba(6,182,212,0.3)",
              borderRadius: "8px",
              color: "#fff",
            }}
          />
          <Bar dataKey="reactions" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
