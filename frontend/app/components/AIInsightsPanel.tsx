import React from 'react';
import { Brain, TrendingUp, MessageSquare, AlertTriangle, CheckCircle, Info, Zap, Target, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function AIInsightsPanel({ insights }) {
  if (!insights) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-cyan-500/20 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-4 animate-pulse">
          <Brain className="w-10 h-10 text-purple-400" />
        </div>
        <p className="text-white/70 text-lg font-medium">AI Analysis Initializing...</p>
        <p className="text-white/40 text-sm mt-2">Gathering audience feedback</p>
      </div>
    );
  }

  const { pacing, qa_grouping, sentiment } = insights;

  const getAlertColor = (level) => {
    const colors = {
      critical: 'from-red-500 to-rose-600',
      warning: 'from-orange-500 to-yellow-600',
      info: 'from-blue-500 to-cyan-600',
      opportunity: 'from-green-500 to-emerald-600',
      none: 'from-gray-500 to-gray-600'
    };
    return colors[level] || colors.none;
  };

  const getAlertIcon = (level) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'opportunity':
        return <CheckCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <ArrowUp className="w-4 h-4 text-green-400" />;
    if (trend === 'declining') return <ArrowDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score) => {
    if (score >= 75) return 'from-green-500 to-emerald-500';
    if (score >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
            <Brain className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">AI-Powered Insights</h2>
            <p className="text-sm text-white/50">Real-time analysis from 3 specialized agents</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full border border-purple-500/30">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <span className="text-sm text-purple-400 font-medium">Live</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* PACING AGENT */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Pacing</h3>
            </div>
            {pacing?.alert_level && pacing.alert_level !== 'none' && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getAlertColor(pacing.alert_level)} text-white flex items-center gap-1`}>
                {getAlertIcon(pacing.alert_level)}
                <span className="uppercase">{pacing.alert_level}</span>
              </div>
            )}
          </div>

          {pacing ? (
            <div className="space-y-4">
              {/* Engagement Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Engagement</span>
                  <span className={`text-3xl font-bold ${getScoreColor(pacing.engagement_score)}`}>
                    {pacing.engagement_score}%
                  </span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getScoreGradient(pacing.engagement_score)}`}
                    style={{ width: `${pacing.engagement_score}%` }}
                  />
                </div>
              </div>

              {/* Status & Trend */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-lg border border-cyan-500/20">
                  <p className="text-xs text-white/50 mb-1">Status</p>
                  <p className="text-sm font-medium text-white capitalize">
                    {pacing.pacing_status.replace('_', ' ')}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-cyan-500/20">
                  <p className="text-xs text-white/50 mb-1">Trend</p>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(pacing.predicted_trend)}
                    <span className="text-sm font-medium text-white capitalize">
                      {pacing.predicted_trend}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Recommendation */}
              {pacing.title && (
                <div className={`p-4 rounded-lg border ${
                  pacing.alert_level === 'critical' ? 'bg-red-500/10 border-red-500/40' :
                  pacing.alert_level === 'warning' ? 'bg-yellow-500/10 border-yellow-500/40' :
                  pacing.alert_level === 'opportunity' ? 'bg-green-500/10 border-green-500/40' :
                  'bg-blue-500/10 border-blue-500/40'
                }`}>
                  <p className="text-sm font-bold text-white mb-1">{pacing.title}</p>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {pacing.recommendation}
                  </p>
                </div>
              )}

              {/* Suggested Actions */}
              {pacing.suggested_actions && pacing.suggested_actions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wide">Actions:</p>
                  <div className="space-y-1.5">
                    {pacing.suggested_actions.slice(0, 3).map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-white/70 bg-white/5 p-2 rounded border border-cyan-500/10">
                        <Target className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Velocity Info */}
              {pacing.velocity_trend && (
                <div className="flex items-center gap-2 text-xs text-white/50 border-t border-white/10 pt-3">
                  <TrendingUp className="w-3 h-3" />
                  <span>{pacing.velocity_trend}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/40">Analyzing pacing...</p>
          )}
        </div>

        {/* Q&A GROUPER AGENT */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Question Themes</h3>
          </div>

          {qa_grouping && qa_grouping.themes && qa_grouping.themes.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-white/10">
                <span className="text-white/60">
                  {qa_grouping.total_themes} themes • {qa_grouping.total_questions} questions
                </span>
                {qa_grouping.quality_score && (
                  <span className={`font-medium ${
                    qa_grouping.quality_score >= 70 ? 'text-green-400' :
                    qa_grouping.quality_score >= 40 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    Q{qa_grouping.quality_score}
                  </span>
                )}
              </div>

              <div 
                className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(6, 182, 212, 0.3) transparent'
                }}
              >
                {qa_grouping.themes.slice(0, 5).map((theme, idx) => (
                  <div key={idx} className="p-4 bg-white/5 rounded-lg border border-blue-500/20 hover:border-blue-500/40 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white flex-1 pr-2">{theme.name}</h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {theme.question_count > 0 && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                            {theme.question_count}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          theme.priority === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                          theme.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                          theme.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                          'bg-green-500/20 text-green-400 border-green-500/40'
                        }`}>
                          {theme.priority}
                        </span>
                      </div>
                    </div>

                    {/* Example Questions */}
                    {theme.examples && theme.examples.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {theme.examples.slice(0, 2).map((example, exIdx) => (
                          <p key={exIdx} className="text-xs text-white/60 pl-3 border-l-2 border-blue-500/30">
                            "{example.length > 70 ? example.substring(0, 70) + '...' : example}"
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Insights */}
                    {theme.insights && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex items-start gap-2">
                          <Target className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-white/70 leading-relaxed">
                              {theme.insights.suggested_response}
                            </p>
                            {theme.insights.time_to_address && (
                              <p className="text-xs text-blue-400 mt-1 font-medium">
                                ⏱ {theme.insights.time_to_address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {qa_grouping.themes.length > 5 && (
                <p className="text-xs text-white/40 text-center pt-2">
                  +{qa_grouping.themes.length - 5} more themes
                </p>
              )}
            </div>
          ) : qa_grouping && qa_grouping.status === 'insufficient_data' ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">Waiting for questions</p>
              <p className="text-xs text-white/30 mt-1">Need at least 2 questions to cluster</p>
            </div>
          ) : (
            <p className="text-sm text-white/40">Analyzing questions...</p>
          )}
        </div>

        {/* SENTIMENT AGENT */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className={`p-2 rounded-lg ${
              sentiment?.overall_sentiment === 'positive' ? 'bg-green-500/20 border border-green-500/30' :
              sentiment?.overall_sentiment === 'negative' ? 'bg-red-500/20 border border-red-500/30' :
              'bg-gray-500/20 border border-gray-500/30'
            }`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Sentiment</h3>
          </div>

          {sentiment ? (
            <div className="space-y-4">
              {/* Mood Display */}
              <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30 text-center">
                <p className="text-2xl mb-2">{sentiment.audience_mood}</p>
                <p className="text-xs text-white/60 uppercase tracking-wider">Audience Mood</p>
              </div>

              {/* Sentiment Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-lg border border-purple-500/20">
                  <p className="text-xs text-white/50 mb-1">Sentiment</p>
                  <p className={`text-sm font-semibold capitalize ${
                    sentiment.overall_sentiment === 'positive' ? 'text-green-400' :
                    sentiment.overall_sentiment === 'negative' ? 'text-red-400' :
                    'text-white/70'
                  }`}>
                    {sentiment.overall_sentiment}
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-purple-500/20">
                  <p className="text-xs text-white/50 mb-1">Emotion</p>
                  <p className="text-sm font-semibold text-white capitalize">
                    {sentiment.dominant_emotion}
                  </p>
                </div>
              </div>

              {/* Confidence & Urgency */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white/50">Confidence</span>
                    <span className="text-xs text-white font-medium">{sentiment.confidence}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${sentiment.confidence}%` }}
                    />
                  </div>
                </div>

                {sentiment.urgency_level && sentiment.urgency_level !== 'low' && (
                  <div className={`px-3 py-2 rounded-lg text-xs font-medium border text-center ${
                    sentiment.urgency_level === 'immediate' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                    sentiment.urgency_level === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                  }`}>
                    Urgency: {sentiment.urgency_level.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Trend */}
              {sentiment.trend && sentiment.trend.trend !== 'insufficient_data' && (
                <div className="p-3 bg-white/5 rounded-lg border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Trend</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(sentiment.trend.trend)}
                      <span className={`text-sm font-medium ${
                        sentiment.trend.trend === 'improving' ? 'text-green-400' :
                        sentiment.trend.trend === 'declining' ? 'text-red-400' :
                        'text-white/70'
                      }`}>
                        {sentiment.trend.direction}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {sentiment.recommendations && sentiment.recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-white/50 font-medium uppercase tracking-wide">Recommendations:</p>
                  <div 
                className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(6, 182, 212, 0.3) transparent'
                }}
              >
                    {sentiment.recommendations.slice(0, 4).map((rec, idx) => (
                      <div key={idx} className="p-2 bg-white/5 rounded border border-purple-500/20">
                        <span className="text-xs text-white/70 leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/40">Analyzing sentiment...</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg border border-cyan-500/10">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Brain className="w-4 h-4" />
          <span>Powered by Google Gemini 2.0 Flash</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {pacing && (
            <span className="text-white/50">
              Updated: <span className="text-white font-medium">just now</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}