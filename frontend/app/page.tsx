"use client"

import Link from "next/link"
import { ArrowRight, Zap, BarChart3, MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/25 rounded-full blur-3xl animate-morph" />
        <div
          className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-morph"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl animate-ambient-float" />
        {/* Accent glow elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-3xl opacity-60" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 border-b border-cyan-500/20 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-transparent backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            className={`text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent animate-gradient-shift ${mounted ? "animate-float-in-left" : "opacity-0"}`}
          >
            PulseX
          </div>
          <div className="flex gap-8 items-center">
            <Link
              href="/audience"
              className="text-sm font-medium text-white/60 hover:text-cyan-400 transition-colors duration-300"
            >
              Audience
            </Link>
            <Link
              href="/presenter"
              className="text-sm font-medium text-white/60 hover:text-cyan-400 transition-colors duration-300"
            >
              Presenter
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Hero text */}
          <div className={`space-y-8 ${mounted ? "animate-float-in-up" : "opacity-0"}`}>
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-cyan-500/30 rounded-full backdrop-blur-sm hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-300">
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs font-semibold text-cyan-300/80">Real-time Feedback Platform</span>
              </div>
              <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-white">Connect with Your </span>
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent animate-gradient-shift">
                  Audience
                </span>
              </h1>
            </div>

            <p className="text-lg text-white/50 leading-relaxed max-w-lg font-light">
              Transform how you present. Get instant feedback from your audience, understand sentiment in real-time, and
              adapt your content on the fly.
            </p>

            <div className="flex gap-4 pt-4">
              <Link
                href="/audience"
                className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300 flex items-center gap-3 btn-premium"
              >
                Start Feedback
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/presenter"
                className="px-8 py-4 border border-cyan-500/40 text-white font-semibold rounded-xl hover:bg-cyan-500/10 hover:border-cyan-500/70 transition-all duration-300 btn-premium"
              >
                View Dashboard
              </Link>
            </div>
          </div>

          {/* Right - Feature cards */}
          <div className="space-y-6">
            {[
              {
                icon: Zap,
                title: "Live Reactions",
                desc: "Instant feedback on your pace and content",
                delay: "stagger-1",
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                desc: "Watch engagement metrics unfold live",
                delay: "stagger-2",
              },
              { icon: MessageSquare, title: "Q&A Stream", desc: "See questions as they arrive", delay: "stagger-3" },
            ].map((feature, i) => {
              const Icon = feature.icon
              return (
                <div
                  key={i}
                  className={`glass p-6 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 group ${feature.delay} ${mounted ? "animate-float-in-right" : "opacity-0"}`}
                  style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg group-hover:from-cyan-500/40 group-hover:to-blue-500/40 transition-all duration-300">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-sm text-white/50">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
