from .base_agent import BaseAgent
from typing import Dict, Any, List, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.gemini_service import gemini_service
import asyncio
from datetime import datetime
import re

class SentimentAgent(BaseAgent):
    def __init__(self):
        super().__init__("Sentiment Agent")
        
        self.sentiment_history = []
        self.max_history = 30
        
        self.emotion_patterns = {
            'excited': {
                'keywords': ['amazing', 'awesome', 'love', 'great', 'excellent', 'perfect', 
                           'wow', 'fantastic', 'brilliant', 'incredible', 'mind blown'],
                'weight': 1.0,
                'sentiment': 'positive'
            },
            'interested': {
                'keywords': ['interesting', 'curious', 'want to know', 'tell me more', 
                           'how does', 'what about', 'can you show', 'example'],
                'weight': 0.8,
                'sentiment': 'positive'
            },
            'confused': {
                'keywords': ['confused', 'lost', "don't understand", "can't follow", 
                           'unclear', 'what', 'huh', 'explain', 'clarify', 'mean'],
                'weight': 1.2,
                'sentiment': 'negative'
            },
            'frustrated': {
                'keywords': ['frustrated', 'annoying', 'difficult', 'hard', 'stuck', 
                           'not working', "can't", 'impossible', 'why', 'failing'],
                'weight': 1.5,
                'sentiment': 'negative'
            },
            'bored': {
                'keywords': ['boring', 'slow', 'tedious', 'dragging', 'skip', 
                           'move on', 'next', 'hurry up', 'get on with'],
                'weight': 1.0,
                'sentiment': 'negative'
            },
            'engaged': {
                'keywords': ['yes', 'makes sense', 'got it', 'understand', 'clear', 
                           'following', 'agree', 'exactly', 'right'],
                'weight': 0.7,
                'sentiment': 'positive'
            },
            'skeptical': {
                'keywords': ['really', 'sure', 'doubt', 'but', 'however', 'what if',
                           'seems', 'supposedly', 'allegedly'],
                'weight': 0.5,
                'sentiment': 'neutral'
            }
        }
        
        self.urgency_patterns = {
            'immediate': ['help', 'urgent', 'stuck', 'broken', 'not working', 'error', 
                         'crash', 'lost', 'stop', 'wait'],
            'high': ['confused', 'unclear', "don't understand", 'clarify', 'explain'],
            'medium': ['question', 'how', 'what', 'when', 'where', 'why'],
            'low': ['interesting', 'curious', 'later', 'eventually']
        }
        
        self.last_gemini_call = None
        self.gemini_cooldown = 10
        self.gemini_cache = {}
    
    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        questions = data.get("questions", [])
        reaction_counts = data.get("reaction_counts", {})
        recent_reactions = data.get("recent_reactions", [])
        
        message_analysis = None
        if questions and len(questions) > 0:
            message_analysis = await self._fast_message_analysis(questions)
        
        reaction_analysis = self._fast_reaction_analysis(reaction_counts)
        
        if message_analysis:
            combined = self._combine_analyses(message_analysis, reaction_analysis, 0.80)
        else:
            combined = self._reaction_only_analysis(reaction_analysis)
        
        should_use_gemini = (
            len(questions) >= 3 and 
            self._should_call_gemini() and
            combined.get('confidence', 0) < 80
        )
        
        if should_use_gemini:
            try:
                gemini_enhancement = await self._smart_gemini_enhancement(questions[-5:], combined)
                if gemini_enhancement:
                    combined = self._merge_gemini_insights(combined, gemini_enhancement)
            except Exception as e:
                print(f"⚠️ Gemini enhancement failed: {e}")
        
        trend = self._calculate_sentiment_trend()
        combined["trend"] = trend
        
        combined["recommendations"] = self._generate_smart_recommendations(
            combined, trend, reaction_counts, questions
        )
        
        combined.update({
            "agent": self.name,
            "analyzed_messages": len(questions) if questions else 0,
            "analyzed_reactions": sum(reaction_counts.values()),
            "data_quality": "high" if message_analysis else "medium",
            "analysis_timestamp": datetime.now().isoformat()
        })
        
        self._update_history(combined)
        self._store_analysis(combined)
        
        return combined
    
    async def _fast_message_analysis(self, questions: List[Dict]) -> Dict[str, Any]:
        if not questions:
            return None
        
        recent = questions[-5:]
        combined_text = " | ".join([q.get("text", "") for q in recent])
        
        if len(combined_text.strip()) < 10:
            return None
        
        emotion_scores = {}
        text_lower = combined_text.lower()
        
        for emotion, config in self.emotion_patterns.items():
            score = 0
            for keyword in config['keywords']:
                if keyword in text_lower:
                    score += config['weight']
            if score > 0:
                emotion_scores[emotion] = score
        
        if not emotion_scores:
            dominant_emotion = "neutral"
            sentiment = "neutral"
            confidence = 50
        else:
            dominant_emotion = max(emotion_scores.items(), key=lambda x: x[1])[0]
            emotion_config = self.emotion_patterns[dominant_emotion]
            sentiment = emotion_config['sentiment']
            
            max_score = emotion_scores[dominant_emotion]
            total_score = sum(emotion_scores.values())
            confidence = min(95, int(60 + (max_score / max(total_score, 1)) * 30))
        
        urgency = self._detect_urgency(combined_text)
        mood = self._generate_mood(sentiment, dominant_emotion, urgency)
        
        question_marks = combined_text.count('?')
        exclamation_marks = combined_text.count('!')
        capital_ratio = sum(1 for c in combined_text if c.isupper()) / max(1, len(combined_text))
        
        if question_marks >= 3:
            confidence = min(confidence, 70)
        if exclamation_marks >= 2:
            confidence += 5
        if capital_ratio > 0.3:
            confidence += 5
        
        return {
            "sentiment": sentiment,
            "emotion": dominant_emotion,
            "confidence": min(95, confidence),
            "urgency": urgency,
            "mood": mood,
            "emotion_scores": emotion_scores,
            "text_features": {
                "question_marks": question_marks,
                "exclamation_marks": exclamation_marks,
                "capital_ratio": round(capital_ratio, 3)
            },
            "reasoning": f"Message analysis: {dominant_emotion} emotion detected with {urgency} urgency",
            "source": "messages"
        }
    
    def _fast_reaction_analysis(self, reaction_counts: Dict[str, int]) -> Dict[str, Any]:
        total = sum(reaction_counts.values())
        
        if total == 0:
            return {
                "sentiment": "neutral",
                "emotion": "unknown",
                "confidence": 0,
                "urgency": "low",
                "source": "reactions"
            }
        
        im_lost = reaction_counts.get("im_lost", 0)
        slow_down = reaction_counts.get("slow_down", 0)
        speed_up = reaction_counts.get("speed_up", 0)
        show_code = reaction_counts.get("show_code", 0)
        
        positive_score = (speed_up * 0.7) + (show_code * 1.0)
        negative_score = (slow_down * 1.0) + (im_lost * 2.0)
        
        if positive_score > negative_score * 1.5:
            sentiment = "positive"
            emotion = "engaged"
        elif negative_score > positive_score * 1.5:
            sentiment = "negative"
            emotion = "confused" if im_lost > slow_down else "overwhelmed"
        else:
            sentiment = "neutral"
            emotion = "neutral"
        
        if im_lost >= 5:
            urgency = "immediate"
        elif im_lost >= 2 or slow_down >= 5:
            urgency = "high"
        elif slow_down >= 3:
            urgency = "medium"
        else:
            urgency = "low"
        
        confidence = min(75, int(40 + (total / 20) * 35))
        
        return {
            "sentiment": sentiment,
            "emotion": emotion,
            "confidence": confidence,
            "urgency": urgency,
            "total_reactions": total,
            "source": "reactions"
        }
    
    def _detect_urgency(self, text: str) -> str:
        text_lower = text.lower()
        
        for level in ['immediate', 'high', 'medium', 'low']:
            patterns = self.urgency_patterns[level]
            if any(pattern in text_lower for pattern in patterns):
                return level
        
        return 'low'
    
    def _combine_analyses(self, message_analysis: Dict, reaction_analysis: Dict, message_weight: float = 0.80) -> Dict[str, Any]:
        sentiment_map = {"positive": 1, "neutral": 0, "negative": -1}
        
        msg_score = sentiment_map.get(message_analysis["sentiment"], 0)
        react_score = sentiment_map.get(reaction_analysis["sentiment"], 0)
        
        combined_score = (msg_score * message_weight) + (react_score * (1 - message_weight))
        
        if combined_score > 0.3:
            final_sentiment = "positive"
        elif combined_score < -0.3:
            final_sentiment = "negative"
        else:
            final_sentiment = "neutral"
        
        final_emotion = message_analysis["emotion"]
        
        final_confidence = int(
            (message_analysis["confidence"] * message_weight) +
            (reaction_analysis["confidence"] * (1 - message_weight))
        )
        
        urgency_order = {"immediate": 4, "high": 3, "medium": 2, "low": 1}
        msg_urgency = urgency_order.get(message_analysis["urgency"], 1)
        react_urgency = urgency_order.get(reaction_analysis["urgency"], 1)
        
        final_urgency_level = max(msg_urgency, react_urgency)
        final_urgency = {v: k for k, v in urgency_order.items()}[final_urgency_level]
        
        final_mood = self._generate_mood(final_sentiment, final_emotion, final_urgency)
        
        return {
            "overall_sentiment": final_sentiment,
            "dominant_emotion": final_emotion,
            "confidence": final_confidence,
            "urgency_level": final_urgency,
            "audience_mood": final_mood,
            "message_analysis": message_analysis,
            "reaction_analysis": reaction_analysis,
            "data_source": f"messages ({int(message_weight*100)}%) + reactions ({int((1-message_weight)*100)}%)"
        }
    
    def _reaction_only_analysis(self, reaction_analysis: Dict) -> Dict[str, Any]:
        mood = self._generate_mood(
            reaction_analysis.get("sentiment", "neutral"),
            reaction_analysis.get("emotion", "neutral"),
            reaction_analysis.get("urgency", "low")
        )
        
        return {
            "overall_sentiment": reaction_analysis.get("sentiment", "neutral"),
            "dominant_emotion": reaction_analysis.get("emotion", "neutral"),
            "confidence": min(65, reaction_analysis.get("confidence", 50)),
            "urgency_level": reaction_analysis.get("urgency", "low"),
            "audience_mood": mood,
            "reaction_analysis": reaction_analysis,
            "data_source": "reactions only (awaiting messages)"
        }
    
    def _generate_mood(self, sentiment: str, emotion: str, urgency: str) -> str:
        mood_map = {
            ("negative", "confused", "immediate"): "🚨 LOST - Critical Confusion",
            ("negative", "frustrated", "immediate"): "😤 FRUSTRATED - Need Help Now",
            ("negative", "confused", "high"): "😕 Confused & Struggling",
            ("negative", "confused", "medium"): "🤔 Getting Confused",
            ("negative", "frustrated", "high"): "😠 Frustrated",
            ("negative", "bored", "medium"): "😴 Losing Interest",
            ("negative", "overwhelmed", "high"): "🥵 Overwhelmed",
            ("neutral", "neutral", "low"): "😐 Neutral / Waiting",
            ("neutral", "interested", "medium"): "🧐 Mildly Interested",
            ("neutral", "skeptical", "low"): "🤨 Skeptical",
            ("positive", "interested", "low"): "😊 Interested & Following",
            ("positive", "interested", "medium"): "🤔 Very Interested",
            ("positive", "engaged", "low"): "👍 Engaged",
            ("positive", "engaged", "medium"): "⚡ Actively Engaged",
            ("positive", "excited", "low"): "😃 Excited",
            ("positive", "excited", "medium"): "🤩 Very Excited",
            ("positive", "excited", "high"): "🚀 Extremely Excited",
        }
        
        if (sentiment, emotion, urgency) in mood_map:
            return mood_map[(sentiment, emotion, urgency)]
        
        emotion_fallback = {
            "excited": "🚀 Excited",
            "interested": "😊 Interested",
            "engaged": "👍 Engaged",
            "confused": "🤔 Confused",
            "frustrated": "😤 Frustrated",
            "bored": "😴 Bored",
            "neutral": "😐 Neutral",
            "skeptical": "🤨 Skeptical",
            "overwhelmed": "🥵 Overwhelmed"
        }
        
        if emotion in emotion_fallback:
            return emotion_fallback[emotion]
        
        if sentiment == "positive":
            return "😊 Positive"
        elif sentiment == "negative":
            return "😕 Negative"
        else:
            return "😐 Neutral"
    
    def _should_call_gemini(self) -> bool:
        if not self.last_gemini_call:
            return True
        
        elapsed = (datetime.now() - self.last_gemini_call).total_seconds()
        return elapsed > self.gemini_cooldown
    
    async def _smart_gemini_enhancement(self, recent_messages: List[Dict], local_analysis: Dict) -> Dict[str, Any]:
        message_texts = tuple(q.get("text", "") for q in recent_messages)
        cache_key = hash(message_texts)
        
        if cache_key in self.gemini_cache:
            return self.gemini_cache[cache_key]
        
        combined_text = " | ".join([q.get("text", "") for q in recent_messages])
        local_emotion = local_analysis.get("dominant_emotion", "neutral")
        local_sentiment = local_analysis.get("overall_sentiment", "neutral")
        
        prompt = f"""Analyze audience sentiment from these messages during a technical presentation:

Messages: "{combined_text}"

Local Analysis: {local_sentiment} sentiment, {local_emotion} emotion

Your task: Validate or refine the analysis. Detect:
1. True emotional tone (excited, confused, frustrated, interested, bored, engaged, skeptical)
2. Sentiment (positive, negative, neutral)
3. Urgency level (immediate, high, medium, low)
4. Confidence (0-100)

Respond ONLY with valid JSON:
{{
  "emotion": "excited" | "confused" | "frustrated" | "interested" | "bored" | "engaged" | "skeptical" | "neutral",
  "sentiment": "positive" | "negative" | "neutral",
  "urgency": "immediate" | "high" | "medium" | "low",
  "confidence": 0-100,
  "reasoning": "brief explanation (20 words max)"
}}"""
        
        try:
            self.last_gemini_call = datetime.now()
            
            response = await gemini_service.generate_text(
                prompt,
                temperature=0.2,
                max_tokens=200,
                use_cache=False
            )
            
            parsed = gemini_service._extract_json_from_response(response)
            
            if parsed and 'emotion' in parsed:
                self.gemini_cache[cache_key] = parsed
                
                if len(self.gemini_cache) > 50:
                    keys = list(self.gemini_cache.keys())
                    for old_key in keys[:-25]:
                        del self.gemini_cache[old_key]
                
                return parsed
            
            return None
            
        except Exception as e:
            print(f"⚠️ Gemini enhancement error: {e}")
            return None
    
    def _merge_gemini_insights(self, local: Dict, gemini: Dict) -> Dict[str, Any]:
        local_confidence = local.get("confidence", 0)
        gemini_confidence = gemini.get("confidence", 0)
        
        if gemini_confidence > local_confidence + 10:
            return {
                **local,
                "dominant_emotion": gemini["emotion"],
                "overall_sentiment": gemini["sentiment"],
                "urgency_level": gemini["urgency"],
                "confidence": min(95, gemini_confidence),
                "gemini_reasoning": gemini.get("reasoning", ""),
                "audience_mood": self._generate_mood(
                    gemini["sentiment"],
                    gemini["emotion"],
                    gemini["urgency"]
                )
            }
        else:
            return {
                **local,
                "gemini_validation": {
                    "emotion": gemini["emotion"],
                    "sentiment": gemini["sentiment"],
                    "agrees": gemini["emotion"] == local.get("dominant_emotion")
                }
            }
    
    def _update_history(self, analysis: Dict):
        self.sentiment_history.append({
            "timestamp": datetime.now(),
            "sentiment": analysis.get("overall_sentiment", "neutral"),
            "emotion": analysis.get("dominant_emotion", "neutral"),
            "confidence": analysis.get("confidence", 0),
            "urgency": analysis.get("urgency_level", "low")
        })
        
        if len(self.sentiment_history) > self.max_history:
            self.sentiment_history = self.sentiment_history[-self.max_history:]
    
    def _calculate_sentiment_trend(self) -> Dict[str, Any]:
        if len(self.sentiment_history) < 3:
            return {
                "trend": "insufficient_data",
                "direction": "➡️ Unknown",
                "confidence": 0
            }
        
        sentiment_map = {"positive": 1, "neutral": 0, "negative": -1}
        recent = self.sentiment_history[-10:]
        scores = [sentiment_map.get(s["sentiment"], 0) for s in recent]
        
        first_half = scores[:len(scores)//2]
        second_half = scores[len(scores)//2:]
        
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)
        
        delta = avg_second - avg_first
        
        if delta > 0.3:
            trend = "improving"
            direction = "↗️ Improving"
            confidence = min(85, int(50 + abs(delta) * 50))
        elif delta < -0.3:
            trend = "declining"
            direction = "↘️ Declining"
            confidence = min(85, int(50 + abs(delta) * 50))
        else:
            trend = "stable"
            direction = "➡️ Stable"
            confidence = 70
        
        return {
            "trend": trend,
            "direction": direction,
            "confidence": confidence,
            "delta": round(delta, 2),
            "data_points": len(recent)
        }
    
    def _generate_smart_recommendations(self, analysis: Dict, trend: Dict, reactions: Dict, questions: List[Dict]) -> List[str]:
        recommendations = []
        
        sentiment = analysis.get("overall_sentiment", "neutral")
        emotion = analysis.get("dominant_emotion", "neutral")
        urgency = analysis.get("urgency_level", "low")
        confidence = analysis.get("confidence", 0)
        has_messages = len(questions) > 0 if questions else False
        
        if urgency == "immediate":
            if emotion == "confused":
                recommendations.append("🚨 STOP NOW: Audience is lost. Pause and ask: 'What's unclear?'")
            elif emotion == "frustrated":
                recommendations.append("🚨 IMMEDIATE ACTION: Frustration detected. Address concerns now.")
            else:
                recommendations.append("⚠️ URGENT: Immediate attention needed. Check in with audience.")
        
        elif urgency == "high":
            if emotion == "confused" and has_messages:
                recommendations.append("⚠️ HIGH PRIORITY: Messages show confusion. Provide concrete examples NOW.")
            elif emotion == "frustrated":
                recommendations.append("⚠️ HIGH PRIORITY: Frustration building. Take Q&A break immediately.")
            elif emotion == "overwhelmed":
                recommendations.append("⚠️ SLOW DOWN: Audience overwhelmed. Reduce pace and simplify.")
        
        if trend.get("trend") == "declining" and confidence > 60:
            recommendations.append(f"📉 TREND WARNING: Sentiment declining. Current mood: {analysis.get('audience_mood', 'Unknown')}")
        elif trend.get("trend") == "improving":
            recommendations.append(f"📈 POSITIVE TREND: Sentiment improving! Keep current approach.")
        
        if emotion == "confused" and urgency == "medium":
            recommendations.append("🤔 CONFUSION DETECTED: Consider quick recap or example.")
        
        if emotion == "bored" and has_messages:
            recommendations.append("😴 LOW ENGAGEMENT: Add interactive element or code demo.")
        
        if emotion == "skeptical":
            recommendations.append("🤨 SKEPTICISM: Provide evidence, examples, or address concerns.")
        
        if emotion == "interested" and sentiment == "positive":
            recommendations.append("😊 GOOD ENGAGEMENT: Audience interested. Great time for deep dive.")
        
        if emotion == "excited" and sentiment == "positive":
            recommendations.append("🚀 EXCELLENT: Audience very excited! Capitalize on this energy.")
        
        im_lost = reactions.get("im_lost", 0)
        show_code = reactions.get("show_code", 0)
        
        if im_lost >= 5:
            recommendations.append(f"🛑 BUTTONS: {im_lost} 'I'm Lost' clicks - critical confusion.")
        elif im_lost >= 3:
            recommendations.append(f"⚠️ BUTTONS: {im_lost} people lost - verify understanding soon.")
        
        if show_code >= 8:
            recommendations.append(f"💻 OPPORTUNITY: Strong demand ({show_code} requests) for code demo.")
        
        if not has_messages and confidence < 60:
            recommendations.append("📊 LOW DATA: Encourage audience to ask questions for better insights.")
        
        if sentiment == "positive" and confidence > 70 and not recommendations:
            recommendations.append("✅ EXCELLENT: Audience sentiment positive. Maintain current momentum!")
        
        if not recommendations:
            if has_messages:
                recommendations.append("➡️ NORMAL: Sentiment neutral. Continue as planned, monitor for changes.")
            else:
                recommendations.append("📊 MONITORING: Awaiting more data. Encourage participation.")
        
        return recommendations[:5]