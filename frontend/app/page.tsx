"use client"

import { useState, useEffect } from 'react'
import { ArrowRight, Zap, Users, Monitor, Copy, Check } from 'lucide-react'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'home' | 'presenter' | 'audience'>('home')
  const [roomCode, setRoomCode] = useState('')
  const [inputRoomCode, setInputRoomCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreateRoom = () => {
    const code = generateRoomCode()
    setRoomCode(code)
    setMode('presenter')
  }

  const handleJoinAsAudience = () => {
    setMode('audience')
  }

  const handleAudienceJoin = () => {
    if (inputRoomCode.trim().length === 6) {
      // Redirection vers la page audience avec le code
      window.location.href = `/audience?room=${inputRoomCode.toUpperCase()}`
    }
  }

  const handlePresenterContinue = () => {
    // Redirection vers le dashboard présentateur avec le code
    window.location.href = `/presenter?room=${roomCode}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Page d'accueil principale
  if (mode === 'home') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/25 rounded-full blur-3xl animate-morph" />
          <div
            className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-morph"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl animate-ambient-float" />
        </div>

        <nav className="relative z-20 border-b border-cyan-500/20 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-transparent backdrop-blur-xl sticky top-0">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div
              className={`text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent animate-gradient-shift ${mounted ? "animate-float-in-left" : "opacity-0"}`}
            >
              PulseX
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-6xl mx-auto px-6 py-20">
          <div className="text-center space-y-8">
            <div className={`space-y-4 ${mounted ? "animate-float-in-up" : "opacity-0"}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-cyan-500/30 rounded-full backdrop-blur-sm">
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

            <p className="text-lg text-white/50 leading-relaxed max-w-2xl mx-auto font-light">
              Transform how you present. Get instant feedback from your audience, understand sentiment in real-time, and
              adapt your content on the fly.
            </p>

            {/* Choice buttons */}
            <div className={`flex flex-col sm:flex-row gap-6 justify-center pt-8 ${mounted ? "animate-float-in-up" : "opacity-0"}`} style={{ animationDelay: "0.2s" }}>
              <button
                onClick={handleCreateRoom}
                className="group px-8 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center gap-3 min-w-[280px]"
              >
                <Monitor className="w-6 h-6" />
                <div className="text-left">
                  <div className="text-lg">Je suis Présentateur</div>
                  <div className="text-xs text-white/70">Créer une nouvelle room</div>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-auto" />
              </button>

              <button
                onClick={handleJoinAsAudience}
                className="group px-8 py-6 border-2 border-cyan-500/40 text-white font-semibold rounded-xl hover:bg-cyan-500/10 hover:border-cyan-500/70 transition-all duration-300 flex items-center justify-center gap-3 min-w-[280px]"
              >
                <Users className="w-6 h-6" />
                <div className="text-left">
                  <div className="text-lg">Je suis Audience</div>
                  <div className="text-xs text-white/70">Rejoindre une room</div>
                </div>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-auto" />
              </button>
            </div>

            {/* Features preview */}
            <div className={`grid md:grid-cols-3 gap-6 pt-16 max-w-4xl mx-auto ${mounted ? "animate-float-in-up" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
              {[
                {
                  icon: Zap,
                  title: "Réactions en Direct",
                  desc: "Feedback instantané sur votre présentation",
                },
                {
                  icon: Monitor,
                  title: "Dashboard Analytics",
                  desc: "Visualisez l'engagement en temps réel",
                },
                {
                  icon: Users,
                  title: "Questions & Réponses",
                  desc: "Interagissez avec votre audience",
                },
              ].map((feature, i) => {
                const Icon = feature.icon
                return (
                  <div
                    key={i}
                    className="glass p-6 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300"
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                        <Icon className="w-6 h-6 text-cyan-400" />
                      </div>
                      <h3 className="font-semibold text-white">{feature.title}</h3>
                      <p className="text-sm text-white/50">{feature.desc}</p>
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

  // Page de création de room pour présentateur
  if (mode === 'presenter') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/25 rounded-full blur-3xl animate-morph" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-morph" />
        </div>

        <nav className="relative z-20 border-b border-cyan-500/20 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-transparent backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
              PulseX
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-2xl mx-auto px-6 py-20">
          <div className={`text-center space-y-8 ${mounted ? "animate-float-in-up" : "opacity-0"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full backdrop-blur-sm">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-xs font-semibold text-green-300">Room Créée avec Succès</span>
            </div>

            <h1 className="text-5xl font-bold text-white">
              Votre Room est Prête !
            </h1>

            <p className="text-white/50">
              Partagez ce code avec votre audience pour qu'ils puissent rejoindre votre présentation
            </p>

            {/* Room code display */}
            <div className="glass p-8 rounded-2xl border border-cyan-500/30">
              <div className="text-sm text-white/50 mb-3">Code de la Room</div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-6xl font-bold tracking-widest bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  {roomCode}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 border border-cyan-500/30 hover:border-cyan-500/50"
                  title="Copier le code"
                >
                  {copied ? (
                    <Check className="w-6 h-6 text-green-400" />
                  ) : (
                    <Copy className="w-6 h-6 text-cyan-400" />
                  )}
                </button>
              </div>
              {copied && (
                <div className="text-xs text-green-400 mt-2 animate-pulse">
                  Code copié dans le presse-papier !
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="glass p-6 rounded-xl border border-cyan-500/20 text-left space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Comment inviter votre audience :
              </h3>
              <ol className="space-y-2 text-sm text-white/60">
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">1.</span>
                  <span>Partagez le code <span className="font-mono text-cyan-400">{roomCode}</span> avec votre audience</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">2.</span>
                  <span>Ils doivent aller sur PulseX et choisir "Je suis Audience"</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">3.</span>
                  <span>Ils entrent le code pour rejoindre votre room</span>
                </li>
              </ol>
            </div>

            <button
              onClick={handlePresenterContinue}
              className="w-full group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center gap-3"
            >
              Accéder au Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setMode('home')}
              className="text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              ← Retour à l'accueil
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Page pour audience - saisie du code
  if (mode === 'audience') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-cyan-500/25 rounded-full blur-3xl animate-morph" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-morph" />
        </div>

        <nav className="relative z-20 border-b border-cyan-500/20 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-transparent backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
              PulseX
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-2xl mx-auto px-6 py-20">
          <div className={`text-center space-y-8 ${mounted ? "animate-float-in-up" : "opacity-0"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full backdrop-blur-sm">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">Mode Audience</span>
            </div>

            <h1 className="text-5xl font-bold text-white">
              Rejoindre une Présentation
            </h1>

            <p className="text-white/50">
              Entrez le code de la room partagé par votre présentateur
            </p>

            {/* Code input */}
            <div className="glass p-8 rounded-2xl border border-cyan-500/30 space-y-6">
              <div>
                <label className="text-sm text-white/50 mb-3 block">Code de la Room</label>
                <input
                  type="text"
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="Entrez le code (6 caractères)"
                  maxLength={6}
                  className="w-full px-6 py-4 bg-white/5 border border-cyan-500/30 rounded-lg text-3xl font-bold tracking-widest text-center text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/60 focus:bg-white/10 transition-all"
                  autoFocus
                />
              </div>

              <button
                onClick={handleAudienceJoin}
                disabled={inputRoomCode.length !== 6}
                className="w-full group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                Rejoindre la Room
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Info box */}
            <div className="glass p-6 rounded-xl border border-cyan-500/20 text-left">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Une fois connecté, vous pourrez :
              </h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex gap-3">
                  <span className="text-cyan-400">✓</span>
                  <span>Envoyer des réactions en temps réel</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">✓</span>
                  <span>Poser des questions au présentateur</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400">✓</span>
                  <span>Voter pour les meilleures questions</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setMode('home')}
              className="text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              ← Retour à l'accueil
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}