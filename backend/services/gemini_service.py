import os
import google.generativeai as genai
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
import asyncio
from functools import lru_cache
import json
import re
from datetime import datetime

load_dotenv()

class GeminiService:
    """
    Ultra-optimized Gemini Service with:
    - Intelligent caching with TTL
    - Parallel processing
    - Advanced prompt engineering
    - Robust error handling
    - Smart rate limiting
    """
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("❌ GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        
        # Use the fastest available model
        try:
            self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
            print("✅ Gemini Service: gemini-2.0-flash-exp (FASTEST)")
        except:
            try:
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                print("✅ Gemini Service: gemini-1.5-flash")
            except:
                self.model = genai.GenerativeModel('gemini-pro')
                print("✅ Gemini Service: gemini-pro")
        
        # Advanced caching system
        self._analysis_cache = {}
        self._cache_ttl = 8  # seconds - aggressive caching
        
        # Rate limiting with burst allowance
        self._last_call = 0
        self._min_interval = 0.3  # 300ms between calls (faster)
        self._call_tokens = 3  # Allow burst of 3 calls
        self._last_refill = asyncio.get_event_loop().time() if asyncio.get_event_loop().is_running() else 0
        
        # Performance metrics
        self.metrics = {
            "total_calls": 0,
            "cache_hits": 0,
            "avg_response_time": 0,
            "errors": 0
        }
    
    async def _rate_limit(self):
        """Token bucket rate limiting for better performance"""
        current_time = asyncio.get_event_loop().time()
        
        # Refill tokens
        time_passed = current_time - self._last_refill
        if time_passed > 1.0:  # Refill every second
            self._call_tokens = min(3, self._call_tokens + 1)
            self._last_refill = current_time
        
        # Check if we have tokens
        if self._call_tokens > 0:
            self._call_tokens -= 1
            self._last_call = current_time
            return
        
        # Wait for minimum interval
        time_since_last = current_time - self._last_call
        if time_since_last < self._min_interval:
            await asyncio.sleep(self._min_interval - time_since_last)
        
        self._last_call = asyncio.get_event_loop().time()
    
    def _get_cache_key(self, prompt: str, params: Dict) -> str:
        """Generate cache key from prompt and params"""
        # Use first 100 chars + params for cache key
        prompt_hash = hash(prompt[:100])
        params_hash = hash(str(sorted(params.items())))
        return f"{prompt_hash}_{params_hash}"
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache entry is still valid"""
        if cache_key not in self._analysis_cache:
            return False
        
        cached_time, _ = self._analysis_cache[cache_key]
        current_time = asyncio.get_event_loop().time()
        return (current_time - cached_time) < self._cache_ttl
    
    def _extract_json_from_response(self, text: str) -> Optional[Dict]:
        """
        Robust JSON extraction from Gemini response
        Handles markdown, extra text, and malformed JSON
        """
        if not text:
            return None
        
        text = text.strip()
        
        # Remove markdown code blocks
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        
        # Find JSON object
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if not json_match:
            return None
        
        json_str = json_match.group(0)
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            # Try to fix common issues
            try:
                # Fix trailing commas
                json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                # Fix single quotes
                json_str = json_str.replace("'", '"')
                return json.loads(json_str)
            except:
                print(f"⚠️ JSON parse failed: {e}")
                return None
    
    def _extract_text_from_response(self, response) -> str:
        """Extract text from Gemini response object"""
        try:
            if hasattr(response, 'text') and response.text:
                return response.text.strip()
        except:
            pass
        
        try:
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content'):
                    parts = []
                    for part in candidate.content.parts:
                        if hasattr(part, 'text'):
                            parts.append(part.text)
                    if parts:
                        return ' '.join(parts).strip()
        except:
            pass
        
        return ""
    
    async def generate_text(
        self, 
        prompt: str, 
        temperature: float = 0.7,
        max_tokens: int = 1000,
        use_cache: bool = True
    ) -> str:
        """
        Generate text with Gemini
        Features: caching, rate limiting, error handling, metrics
        """
        start_time = asyncio.get_event_loop().time()
        
        # Check cache
        if use_cache:
            cache_key = self._get_cache_key(prompt, {"temp": temperature, "max": max_tokens})
            if self._is_cache_valid(cache_key):
                _, cached_result = self._analysis_cache[cache_key]
                self.metrics["cache_hits"] += 1
                print(f"📦 Cache hit (saved ~{int((asyncio.get_event_loop().time() - start_time) * 1000)}ms)")
                return cached_result
        
        # Rate limiting
        await self._rate_limit()
        
        try:
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            
            # Permissive safety settings for business content
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
            
            response = self.model.generate_content(
                prompt,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            text = self._extract_text_from_response(response)
            
            if not text:
                print("⚠️ Empty Gemini response")
                return "Analysis temporarily unavailable"
            
            # Update metrics
            elapsed = asyncio.get_event_loop().time() - start_time
            self.metrics["total_calls"] += 1
            self.metrics["avg_response_time"] = (
                (self.metrics["avg_response_time"] * (self.metrics["total_calls"] - 1) + elapsed) 
                / self.metrics["total_calls"]
            )
            
            # Cache result
            if use_cache:
                cache_key = self._get_cache_key(prompt, {"temp": temperature, "max": max_tokens})
                self._analysis_cache[cache_key] = (asyncio.get_event_loop().time(), text)
            
            print(f"✅ Gemini response ({int(elapsed * 1000)}ms)")
            return text
            
        except Exception as e:
            self.metrics["errors"] += 1
            print(f"❌ Gemini error: {e}")
            return f"Error: {str(e)[:100]}"
    
    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        ENHANCED: Analyze sentiment with better prompts and fallback logic
        """
        if not text or len(text.strip()) < 3:
            return self._get_neutral_sentiment()
        
        # Limit text length for faster processing
        text = text[:600]
        
        prompt = f"""You are an expert at analyzing audience sentiment during presentations.

Analyze this audience feedback and respond with ONLY valid JSON:

{{
  "sentiment": "positive" | "negative" | "neutral",
  "emotion": "interested" | "confused" | "frustrated" | "excited" | "bored" | "engaged",
  "confidence": 0-100,
  "reasoning": "one sentence explanation",
  "urgency": "low" | "medium" | "high"
}}

Feedback: "{text}"

JSON:"""
        
        response = await self.generate_text(prompt, temperature=0.2, max_tokens=250, use_cache=True)
        parsed = self._extract_json_from_response(response)
        
        if parsed and self._validate_sentiment_response(parsed):
            return parsed
        
        # Smart keyword-based fallback
        return self._keyword_sentiment_analysis(text)
    
    def _validate_sentiment_response(self, data: Dict) -> bool:
        """Validate sentiment response structure"""
        required = ['sentiment', 'emotion', 'confidence']
        return all(k in data for k in required)
    
    def _keyword_sentiment_analysis(self, text: str) -> Dict[str, Any]:
        """Advanced keyword-based sentiment analysis"""
        text_lower = text.lower()
        
        # Emotion detection patterns
        patterns = {
            'confused': ['confused', 'lost', "don't understand", 'unclear', 'what', 'help', 'explain again'],
            'frustrated': ['frustrated', 'annoyed', 'too fast', 'slow down', 'stop', 'wait'],
            'excited': ['great', 'love', 'awesome', 'excellent', 'amazing', 'wow', 'cool', 'perfect'],
            'interested': ['show code', 'example', 'demo', 'more', 'how', 'can you', 'tell me'],
            'bored': ['slow', 'boring', 'tedious', 'skip', 'next', 'move on']
        }
        
        emotion_scores = {}
        for emotion, keywords in patterns.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                emotion_scores[emotion] = score
        
        if not emotion_scores:
            return self._get_neutral_sentiment()
        
        dominant_emotion = max(emotion_scores.items(), key=lambda x: x[1])[0]
        
        # Determine sentiment
        sentiment_map = {
            'confused': 'negative',
            'frustrated': 'negative',
            'bored': 'negative',
            'excited': 'positive',
            'interested': 'positive'
        }
        sentiment = sentiment_map.get(dominant_emotion, 'neutral')
        
        # Determine urgency
        urgency = 'high' if dominant_emotion in ['confused', 'frustrated'] else 'medium' if dominant_emotion == 'bored' else 'low'
        
        return {
            "sentiment": sentiment,
            "emotion": dominant_emotion,
            "confidence": 70,
            "reasoning": f"Keyword analysis detected {dominant_emotion} emotion",
            "urgency": urgency
        }
    
    def _get_neutral_sentiment(self) -> Dict[str, Any]:
        """Return neutral sentiment"""
        return {
            "sentiment": "neutral",
            "emotion": "neutral",
            "confidence": 50,
            "reasoning": "Insufficient data for analysis",
            "urgency": "low"
        }
    
    async def cluster_questions(self, questions: List[str]) -> Dict[str, Any]:
        """
        ENHANCED: Superior question clustering with semantic understanding
        """
        if not questions:
            return {"themes": [], "total_questions": 0}
        
        # Filter out noise
        valid_questions = [q for q in questions if len(q.strip()) > 5]
        
        if len(valid_questions) < 2:
            return {
                "themes": [{
                    "name": "General Questions",
                    "count": len(valid_questions),
                    "examples": valid_questions[:3],
                    "priority": "medium"
                }],
                "total_questions": len(valid_questions)
            }
        
        # Limit to most recent questions
        questions_to_analyze = valid_questions[-15:]
        
        # Create numbered list for better parsing
        questions_text = "\n".join([f"{i+1}. {q[:150]}" for i, q in enumerate(questions_to_analyze)])
        
        prompt = f"""You are an AI specializing in semantic clustering of audience questions during presentations.

Analyze these {len(questions_to_analyze)} questions and group them into 2-5 meaningful themes based on:
- Topic similarity (technical, conceptual, pricing, implementation, etc.)
- Question intent (seeking clarification, asking for examples, expressing confusion)
- Urgency level

IMPORTANT RULES:
- Do NOT group unrelated questions (e.g., "hey" should NOT be with "can you slow down")
- Ignore greetings, noise, and off-topic remarks unless they form a clear pattern
- Focus on substantive questions that require presenter attention
- Prioritize themes based on question quality and urgency

Respond with ONLY valid JSON:

{{
  "themes": [
    {{
      "name": "descriptive theme name",
      "count": number_of_questions,
      "examples": ["question 1", "question 2"],
      "priority": "critical" | "high" | "medium" | "low",
      "category": "technical" | "conceptual" | "feedback" | "clarification" | "other"
    }}
  ],
  "total_questions": {len(questions_to_analyze)},
  "quality_score": 0-100
}}

Questions:
{questions_text}

JSON:"""
        
        response = await self.generate_text(prompt, temperature=0.3, max_tokens=800, use_cache=False)
        parsed = self._extract_json_from_response(response)
        
        if parsed and 'themes' in parsed and len(parsed['themes']) > 0:
            # Validate and enrich themes
            return self._enrich_themes(parsed, questions_to_analyze)
        
        # Fallback: Advanced semantic clustering
        return self._semantic_clustering_fallback(questions_to_analyze)
    
    def _enrich_themes(self, result: Dict, questions: List[str]) -> Dict:
        """Enrich theme data with additional metadata"""
        for theme in result.get('themes', []):
            # Ensure all required fields exist
            theme.setdefault('priority', 'medium')
            theme.setdefault('category', 'other')
            theme.setdefault('count', len(theme.get('examples', [])))
        
        # Sort themes by priority
        priority_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        result['themes'].sort(key=lambda t: priority_order.get(t.get('priority', 'medium'), 2), reverse=True)
        
        return result
    
    def _semantic_clustering_fallback(self, questions: List[str]) -> Dict[str, Any]:
        """
        Advanced fallback clustering using semantic patterns
        """
        themes = {
            'technical': [],
            'conceptual': [],
            'feedback': [],
            'clarification': [],
            'noise': []
        }
        
        # Categorize each question
        for q in questions:
            q_lower = q.lower()
            
            # Check length - very short questions are likely noise
            if len(q.strip()) < 10:
                themes['noise'].append(q)
                continue
            
            # Technical questions
            if any(kw in q_lower for kw in ['code', 'api', 'function', 'implementation', 'how to', 'syntax', 'error', 'debug']):
                themes['technical'].append(q)
            # Conceptual questions
            elif any(kw in q_lower for kw in ['why', 'what is', 'explain', 'concept', 'understand', 'difference between', 'when to use']):
                themes['conceptual'].append(q)
            # Feedback (pacing, style)
            elif any(kw in q_lower for kw in ['slow down', 'speed up', 'too fast', 'too slow', 'can you repeat']):
                themes['feedback'].append(q)
            # Clarification
            elif any(kw in q_lower for kw in ['clarify', 'confused', 'not clear', 'what do you mean', 'can you explain']):
                themes['clarification'].append(q)
            # Catch remaining substantive questions
            elif len(q.strip()) > 15:
                themes['conceptual'].append(q)
            else:
                themes['noise'].append(q)
        
        # Build theme objects
        result_themes = []
        
        theme_config = {
            'technical': {'name': 'Technical Implementation', 'priority': 'high', 'category': 'technical'},
            'conceptual': {'name': 'Conceptual Understanding', 'priority': 'high', 'category': 'conceptual'},
            'clarification': {'name': 'Needs Clarification', 'priority': 'critical', 'category': 'clarification'},
            'feedback': {'name': 'Pacing & Delivery Feedback', 'priority': 'medium', 'category': 'feedback'},
        }
        
        for key, config in theme_config.items():
            if themes[key]:
                result_themes.append({
                    'name': config['name'],
                    'count': len(themes[key]),
                    'examples': themes[key][:3],
                    'priority': config['priority'],
                    'category': config['category']
                })
        
        # Sort by priority
        priority_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        result_themes.sort(key=lambda t: priority_order.get(t['priority'], 2), reverse=True)
        
        # Calculate quality score
        substantive_questions = sum(len(themes[k]) for k in ['technical', 'conceptual', 'clarification'])
        quality_score = min(100, int((substantive_questions / len(questions)) * 100)) if questions else 0
        
        return {
            "themes": result_themes,
            "total_questions": len(questions),
            "quality_score": quality_score,
            "analysis_method": "semantic_fallback"
        }
    
    async def analyze_pacing(
        self, 
        reaction_counts: Dict[str, int],
        recent_reactions: List,
        duration_seconds: int = 60
    ) -> Dict[str, Any]:
        """
        ENHANCED: Pacing analysis with predictive insights
        """
        im_lost = reaction_counts.get('im_lost', 0)
        slow_down = reaction_counts.get('slow_down', 0)
        speed_up = reaction_counts.get('speed_up', 0)
        show_code = reaction_counts.get('show_code', 0)
        total = sum(reaction_counts.values())
        
        # Critical alerts (immediate response)
        if im_lost >= 5:
            return {
                "pacing_status": "critical",
                "alert_level": "critical",
                "recommendation": "🚨 STOP: Too many people are lost! Pause and ask for questions.",
                "reasoning": f"{im_lost} 'I'm Lost' reactions indicate serious confusion",
                "engagement_score": 25,
                "action_required": True,
                "suggested_actions": [
                    "Pause immediately",
                    "Ask 'What part is confusing?'",
                    "Recap last 2-3 minutes",
                    "Provide a concrete example"
                ]
            }
        
        if slow_down >= 8:
            return {
                "pacing_status": "too_fast",
                "alert_level": "warning",
                "recommendation": "⚠️ Slow down significantly - audience is struggling to keep up",
                "reasoning": f"{slow_down} slow down requests indicate pace is too fast",
                "engagement_score": 40,
                "action_required": True,
                "suggested_actions": [
                    "Reduce speaking speed by 20%",
                    "Add more pauses between concepts",
                    "Check for understanding"
                ]
            }
        
        # Use Gemini for nuanced analysis when we have sufficient data
        if total >= 5:
            try:
                prompt = f"""You are an expert in presentation pacing analysis.

Analyze this audience feedback data from the last {duration_seconds} seconds:
- Speed Up reactions: {speed_up}
- Slow Down reactions: {slow_down}
- Show Code reactions: {show_code}
- I'm Lost reactions: {im_lost}
- Total reactions: {total}

Provide ONLY valid JSON:

{{
  "pacing_status": "excellent" | "good" | "too_fast" | "too_slow" | "critical",
  "alert_level": "none" | "info" | "warning" | "critical",
  "recommendation": "specific, actionable advice in one sentence",
  "reasoning": "brief explanation",
  "engagement_score": 0-100,
  "action_required": true | false,
  "predicted_trend": "improving" | "stable" | "declining",
  "suggested_actions": ["action 1", "action 2"]
}}

JSON:"""
                
                response = await self.generate_text(prompt, temperature=0.2, max_tokens=400, use_cache=False)
                parsed = self._extract_json_from_response(response)
                
                if parsed and all(k in parsed for k in ['pacing_status', 'recommendation', 'engagement_score']):
                    return parsed
            except Exception as e:
                print(f"⚠️ Gemini pacing analysis failed: {e}")
        
        # Rule-based fallback
        return self._rule_based_pacing(reaction_counts, total)
    
    def _rule_based_pacing(self, counts: Dict[str, int], total: int) -> Dict[str, Any]:
        """Rule-based pacing analysis fallback"""
        speed_up = counts.get('speed_up', 0)
        slow_down = counts.get('slow_down', 0)
        show_code = counts.get('show_code', 0)
        im_lost = counts.get('im_lost', 0)
        
        if speed_up >= 5 and slow_down <= 2 and im_lost == 0:
            return {
                "pacing_status": "too_slow",
                "alert_level": "info",
                "recommendation": "🚀 Audience wants faster pace - you can speed up!",
                "reasoning": f"{speed_up} speed up requests with minimal confusion",
                "engagement_score": 75,
                "action_required": False,
                "predicted_trend": "stable",
                "suggested_actions": ["Increase pace by 15%", "Skip basic examples"]
            }
        
        if show_code >= 10:
            return {
                "pacing_status": "good",
                "alert_level": "info",
                "recommendation": "💻 Strong interest in code examples - time for a demo!",
                "reasoning": f"{show_code} show code requests indicate high technical engagement",
                "engagement_score": 85,
                "action_required": False,
                "predicted_trend": "improving",
                "suggested_actions": ["Live code demonstration", "Show real-world example"]
            }
        
        if total < 3:
            return {
                "pacing_status": "uncertain",
                "alert_level": "none",
                "recommendation": "ℹ️ Not enough feedback yet - continue normally",
                "reasoning": "Insufficient data for analysis",
                "engagement_score": 60,
                "action_required": False,
                "predicted_trend": "stable",
                "suggested_actions": ["Encourage audience participation"]
            }
        
        # Default: balanced
        positive = speed_up + show_code
        negative = slow_down + (im_lost * 2)
        score = max(40, min(95, 70 + (positive - negative) * 4))
        
        return {
            "pacing_status": "good",
            "alert_level": "none",
            "recommendation": "✅ Pacing is well-balanced. Maintain current pace!",
            "reasoning": "Balanced reactions indicate appropriate pace",
            "engagement_score": round(score),
            "action_required": False,
            "predicted_trend": "stable",
            "suggested_actions": ["Keep current momentum"]
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get service performance metrics"""
        cache_hit_rate = (self.metrics["cache_hits"] / max(1, self.metrics["total_calls"])) * 100
        
        return {
            "total_api_calls": self.metrics["total_calls"],
            "cache_hits": self.metrics["cache_hits"],
            "cache_hit_rate": f"{cache_hit_rate:.1f}%",
            "avg_response_time_ms": int(self.metrics["avg_response_time"] * 1000),
            "errors": self.metrics["errors"],
            "error_rate": f"{(self.metrics['errors'] / max(1, self.metrics['total_calls'])) * 100:.1f}%"
        }

# Singleton instance
try:
    gemini_service = GeminiService()
    print("🤖 Gemini Service initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize Gemini Service: {e}")
    gemini_service = None