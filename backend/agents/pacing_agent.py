from .base_agent import BaseAgent
from typing import Dict, Any, List
import asyncio
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.gemini_service import gemini_service

class PacingAgent(BaseAgent):
    """
    ULTRA-OPTIMIZED Pacing Agent with Hybrid AI
    - INSTANT rule-based responses (<50ms) for critical situations
    - Smart Gemini analysis for nuanced insights (runs in parallel)
    - Predictive trend analysis
    - Context-aware recommendations
    """
    
    def __init__(self):
        super().__init__("Pacing Agent")
        
        # Dynamic thresholds (adjust based on audience size)
        self.base_thresholds = {
            "im_lost_critical": 5,
            "im_lost_warning": 3,
            "slow_down_critical": 8,
            "slow_down_warning": 5,
            "speed_up_threshold": 5,
            "show_code_demand": 10,
            "show_code_interest": 6
        }
        
        # Historical tracking for trend analysis
        self.engagement_history = []  # Last 10 scores
        self.reaction_velocity = []  # Reactions per second
        self.last_alert_time = {}  # Prevent alert spam
        self.alert_cooldown = 15  # seconds
        
        # AI Enhancement tracking
        self.last_ai_enhancement = None
        self.ai_enhancement_cooldown = 10  # Only enhance every 10s
        self.ai_cache = {}  # Cache AI insights
        
    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        HYBRID ANALYSIS - Best of both worlds:
        1. INSTANT rule-based analysis (<50ms) - ALWAYS runs
        2. Smart Gemini enhancement (parallel) - runs when appropriate
        """
        reaction_counts = data.get("reaction_counts", {})
        recent_reactions = data.get("recent_reactions", [])
        time_window = data.get("time_window", 60)
        audience_size = data.get("audience_size", 10)
        
        # Adjust thresholds based on audience size
        thresholds = self._adjust_thresholds(audience_size)
        
        # STEP 1: INSTANT rule-based analysis (always runs)
        instant_result = self._instant_analysis(
            reaction_counts, 
            recent_reactions,
            thresholds, 
            time_window
        )
        
        # STEP 2: Calculate velocity and trends (still instant)
        velocity = self._calculate_reaction_velocity(recent_reactions)
        trend = self._calculate_engagement_trend()
        
        # STEP 3: Enhance with velocity insights
        instant_result["reaction_velocity"] = velocity
        instant_result["velocity_trend"] = self._interpret_velocity(velocity)
        instant_result["predicted_trend"] = trend["direction"]
        instant_result["trend_confidence"] = trend["confidence"]
        
        # STEP 4: Smart alerts with cooldown
        instant_result["alerts"] = self._generate_smart_alerts(
            reaction_counts, 
            thresholds,
            velocity
        )
        
        # STEP 5: Add metadata
        instant_result["reaction_counts"] = reaction_counts
        instant_result["total_reactions"] = sum(reaction_counts.values())
        instant_result["response_time"] = "instant"
        instant_result["analysis_timestamp"] = datetime.now().isoformat()
        
        # STEP 6: Decide if we should enhance with AI
        should_use_ai = self._should_enhance_with_ai(
            reaction_counts, 
            instant_result
        )
        
        if should_use_ai:
            # Run AI enhancement in parallel (non-blocking)
            asyncio.create_task(
                self._enhance_with_ai_async(instant_result, reaction_counts, recent_reactions)
            )
            instant_result["ai_enhancement"] = "running"
        else:
            instant_result["ai_enhancement"] = "not_needed"
        
        # Update history
        self._update_history(instant_result["engagement_score"])
        
        # Store analysis
        self._store_analysis(instant_result)
        
        return instant_result
    
    def _should_enhance_with_ai(self, counts: Dict[str, int], result: Dict) -> bool:
        """
        Smart decision: when to use expensive AI
        Only use AI when:
        - We have sufficient data (5+ reactions)
        - Situation is ambiguous (score 40-70)
        - Cooldown period has passed
        - NOT in critical situations (rules handle those)
        """
        total = sum(counts.values())
        score = result.get("engagement_score", 50)
        alert_level = result.get("alert_level", "none")
        
        # Don't waste AI on critical situations - rules are faster and correct
        if alert_level == "critical":
            return False
        
        # Need enough data
        if total < 5:
            return False
        
        # Check cooldown
        if self.last_ai_enhancement:
            elapsed = (datetime.now() - self.last_ai_enhancement).total_seconds()
            if elapsed < self.ai_enhancement_cooldown:
                return False
        
        # Use AI for ambiguous situations (40-70 score range)
        # Or when we have lots of data (15+ reactions)
        return (40 <= score <= 70) or total >= 15
    
    async def _enhance_with_ai_async(
        self, 
        base_result: Dict, 
        counts: Dict[str, int],
        recent_reactions: List
    ):
        """
        Enhance results with Gemini AI (runs async, non-blocking)
        Provides nuanced insights that rules can't capture
        """
        try:
            self.last_ai_enhancement = datetime.now()
            
            # Check cache first
            cache_key = self._get_ai_cache_key(counts)
            if cache_key in self.ai_cache:
                cached_time, cached_result = self.ai_cache[cache_key]
                if (datetime.now() - cached_time).total_seconds() < 30:
                    print("🎯 Using cached AI insight")
                    return cached_result
            
            # Call Gemini for nuanced analysis
            ai_result = await gemini_service.analyze_pacing(
                reaction_counts=counts,
                recent_reactions=recent_reactions,
                duration_seconds=60
            )
            
            # Merge AI insights with base result
            if ai_result and "recommendation" in ai_result:
                # Store AI enhancement separately so we don't override instant results
                base_result["ai_insights"] = {
                    "recommendation": ai_result.get("recommendation"),
                    "reasoning": ai_result.get("reasoning"),
                    "confidence": ai_result.get("confidence", 70),
                    "suggested_actions": ai_result.get("suggested_actions", []),
                    "enhanced_at": datetime.now().isoformat()
                }
                
                # Update cache
                self.ai_cache[cache_key] = (datetime.now(), ai_result)
                
                # Clear old cache entries
                if len(self.ai_cache) > 20:
                    oldest_keys = sorted(
                        self.ai_cache.keys(),
                        key=lambda k: self.ai_cache[k][0]
                    )[:10]
                    for k in oldest_keys:
                        del self.ai_cache[k]
                
                print("✅ AI enhancement completed")
            
        except Exception as e:
            print(f"⚠️ AI enhancement failed (gracefully continuing): {e}")
    
    def _get_ai_cache_key(self, counts: Dict[str, int]) -> str:
        """Generate cache key from reaction counts"""
        return f"{counts.get('im_lost', 0)}:{counts.get('slow_down', 0)}:{counts.get('speed_up', 0)}:{counts.get('show_code', 0)}"
    
    def _adjust_thresholds(self, audience_size: int) -> Dict[str, int]:
        """
        Dynamically adjust thresholds based on audience size
        Small audience (1-5): Lower thresholds (60% scale)
        Medium (6-20): Normal thresholds (100% scale)
        Large (20+): Higher thresholds (130% scale)
        """
        if audience_size <= 5:
            scale = 0.6  # Lower thresholds for small groups
        elif audience_size <= 20:
            scale = 1.0  # Normal
        else:
            scale = 1.3  # Higher thresholds for large groups
        
        return {
            key: max(1, int(value * scale))
            for key, value in self.base_thresholds.items()
        }
    
    def _instant_analysis(
        self, 
        counts: Dict[str, int], 
        recent: List[Dict],
        thresholds: Dict[str, int],
        duration: int
    ) -> Dict[str, Any]:
        """
        Lightning-fast rule-based analysis
        Processes in <20ms - CRITICAL for real-time feedback
        """
        im_lost = counts.get('im_lost', 0)
        slow_down = counts.get('slow_down', 0)
        speed_up = counts.get('speed_up', 0)
        show_code = counts.get('show_code', 0)
        total = sum(counts.values())
        
        # Calculate recency-weighted scores (recent reactions matter more)
        weighted_scores = self._calculate_weighted_scores(recent)
        
        # === CRITICAL SITUATIONS (Priority 1) - INSTANT RESPONSE ===
        if im_lost >= thresholds["im_lost_critical"]:
            return self._create_result(
                status="critical",
                alert="critical",
                score=20,
                trend="declining",
                action_required=True,
                title="🚨 CRITICAL: Audience Lost",
                recommendation=f"STOP IMMEDIATELY: {im_lost} people are lost. Pause and ask: 'What needs clarification?'",
                reasoning=f"Critical confusion threshold exceeded ({im_lost}/{thresholds['im_lost_critical']})",
                actions=[
                    "Stop talking immediately",
                    "Ask: 'What part is confusing?'",
                    "Recap last 2-3 key points",
                    "Show concrete example or diagram",
                    "Check understanding before continuing"
                ],
                urgency="immediate"
            )
        
        if slow_down >= thresholds["slow_down_critical"]:
            return self._create_result(
                status="too_fast",
                alert="warning",
                score=35,
                trend="declining",
                action_required=True,
                title="⚠️ SLOW DOWN: Pace Too Fast",
                recommendation=f"Reduce pace immediately. {slow_down} requests to slow down.",
                reasoning=f"Multiple slow-down requests ({slow_down}/{thresholds['slow_down_critical']})",
                actions=[
                    "Reduce speaking speed by 25%",
                    "Add 3-5 second pauses between concepts",
                    "Repeat last key point",
                    "Ask: 'Everyone following so far?'"
                ],
                urgency="high"
            )
        
        # === WARNING SITUATIONS (Priority 2) ===
        if im_lost >= thresholds["im_lost_warning"]:
            return self._create_result(
                status="concerning",
                alert="warning",
                score=45,
                trend="declining",
                action_required=True,
                title="⚠️ WARNING: Confusion Detected",
                recommendation=f"Some confusion detected ({im_lost} lost). Address soon.",
                reasoning=f"Early confusion signals ({im_lost}/{thresholds['im_lost_warning']})",
                actions=[
                    "Quick comprehension check",
                    "Ask: 'Any questions so far?'",
                    "Provide 30-second summary",
                    "Slow down slightly"
                ],
                urgency="medium"
            )
        
        if slow_down >= thresholds["slow_down_warning"] and im_lost >= 1:
            return self._create_result(
                status="slightly_fast",
                alert="info",
                score=55,
                trend="stable",
                action_required=False,
                title="📊 INFO: Consider Slowing Down",
                recommendation=f"Some requests to slow down ({slow_down}). Consider adjusting pace.",
                reasoning="Multiple pace-down requests with some confusion",
                actions=[
                    "Reduce pace by 10-15%",
                    "Add brief pauses",
                    "Monitor for more feedback"
                ],
                urgency="low"
            )
        
        # === POSITIVE SITUATIONS (Priority 3) - OPPORTUNITIES ===
        if show_code >= thresholds["show_code_demand"]:
            return self._create_result(
                status="excellent",
                alert="info",
                score=88,
                trend="stable",
                action_required=False,
                title="💻 OPPORTUNITY: Code Demo Requested",
                recommendation=f"Strong demand for code! {show_code} requests. Perfect time for demo.",
                reasoning=f"High code interest ({show_code}/{thresholds['show_code_demand']})",
                actions=[
                    "Start live coding session",
                    "Show real-world example",
                    "Walk through implementation step-by-step",
                    "Explain as you code"
                ],
                urgency="opportunity"
            )
        
        if show_code >= thresholds["show_code_interest"]:
            return self._create_result(
                status="good",
                alert="info",
                score=78,
                trend="improving",
                action_required=False,
                title="💡 Interest: Code Examples Wanted",
                recommendation=f"Audience interested in code ({show_code} requests). Consider demo soon.",
                reasoning="Growing code interest",
                actions=[
                    "Plan code demonstration",
                    "Prepare example",
                    "Ask: 'Want to see this in code?'"
                ],
                urgency="low"
            )
        
        if speed_up >= thresholds["speed_up_threshold"] and slow_down <= 2 and im_lost == 0:
            return self._create_result(
                status="too_slow",
                alert="info",
                score=72,
                trend="stable",
                action_required=False,
                title="🚀 INFO: Audience Ready for More",
                recommendation=f"Audience ready to move faster ({speed_up} requests). Increase pace.",
                reasoning="Speed-up requests with no confusion signals",
                actions=[
                    "Increase pace by 15-20%",
                    "Skip trivial examples",
                    "Move to advanced topics",
                    "Engage with harder questions"
                ],
                urgency="opportunity"
            )
        
        # === NEUTRAL/LOW DATA SITUATIONS ===
        if total < 3:
            return self._create_result(
                status="insufficient_data",
                alert="none",
                score=65,
                trend="unknown",
                action_required=False,
                title="📊 Monitoring: Gathering Feedback",
                recommendation="Not enough feedback yet. Encourage participation.",
                reasoning=f"Only {total} reactions - need more data",
                actions=[
                    "Ask: 'Any questions so far?'",
                    "Remind audience of reaction buttons",
                    "Check engagement visually"
                ],
                urgency="none"
            )
        
        # === DEFAULT: BALANCED/GOOD ===
        # Calculate dynamic score based on reaction balance
        positive_weight = (speed_up * 0.8) + (show_code * 1.0)
        negative_weight = (slow_down * 1.2) + (im_lost * 2.5)
        
        balance_score = 70 + (positive_weight - negative_weight) * 3
        balance_score = max(50, min(90, balance_score))
        
        return self._create_result(
            status="good",
            alert="none",
            score=int(balance_score),
            trend="stable",
            action_required=False,
            title="✅ Good: Pacing Optimal",
            recommendation="Excellent pacing! Audience engaged. Maintain current momentum.",
            reasoning=f"Balanced reactions indicate optimal pace ({total} total reactions)",
            actions=[
                "Maintain current pace",
                "Keep energy level",
                "Continue as planned"
            ],
            urgency="none"
        )
    
    def _create_result(
        self, 
        status: str, 
        alert: str, 
        score: int,
        trend: str,
        action_required: bool,
        title: str,
        recommendation: str,
        reasoning: str,
        actions: List[str],
        urgency: str
    ) -> Dict[str, Any]:
        """Helper to create consistent result structure"""
        return {
            "agent": self.name,
            "pacing_status": status,
            "alert_level": alert,
            "engagement_score": score,
            "predicted_trend": trend,
            "action_required": action_required,
            "title": title,
            "recommendation": recommendation,
            "reasoning": reasoning,
            "suggested_actions": actions,
            "urgency": urgency
        }
    
    def _calculate_weighted_scores(self, reactions: List[Dict]) -> Dict[str, float]:
        """
        Calculate recency-weighted scores
        Recent reactions get higher weight (exponential decay)
        """
        if not reactions:
            return {"im_lost": 0, "slow_down": 0, "speed_up": 0, "show_code": 0}
        
        now = datetime.now()
        scores = {"im_lost": 0, "slow_down": 0, "speed_up": 0, "show_code": 0}
        
        for reaction in reactions:
            try:
                timestamp = datetime.fromisoformat(reaction["timestamp"])
                age_seconds = (now - timestamp).total_seconds()
                
                # Exponential decay: weight = e^(-age/30)
                # Recent (0-10s): weight ~1.0
                # Medium (10-30s): weight ~0.5
                # Old (30-60s): weight ~0.1
                weight = 2.71828 ** (-age_seconds / 30)
                
                reaction_type = reaction.get("type", "")
                if reaction_type in scores:
                    scores[reaction_type] += weight
            except:
                continue
        
        return scores
    
    def _calculate_reaction_velocity(self, reactions: List[Dict]) -> Dict[str, Any]:
        """
        Calculate reaction velocity (reactions per second)
        Indicates engagement intensity
        """
        if len(reactions) < 2:
            return {"rate": 0, "trend": "stable", "intensity": "low"}
        
        try:
            timestamps = []
            for r in reactions:
                try:
                    timestamps.append(datetime.fromisoformat(r["timestamp"]))
                except:
                    continue
            
            if len(timestamps) < 2:
                return {"rate": 0, "trend": "stable", "intensity": "low"}
            
            timestamps.sort()
            
            # Calculate rate over last 30 seconds
            now = datetime.now()
            recent = [t for t in timestamps if (now - t).total_seconds() <= 30]
            
            if not recent:
                return {"rate": 0, "trend": "stable", "intensity": "low"}
            
            time_span = (recent[-1] - recent[0]).total_seconds()
            rate = len(recent) / max(1, time_span)
            
            # Determine intensity
            if rate > 0.5:
                intensity = "high"
            elif rate > 0.2:
                intensity = "medium"
            else:
                intensity = "low"
            
            # Track velocity history for trend
            self.reaction_velocity.append(rate)
            if len(self.reaction_velocity) > 10:
                self.reaction_velocity = self.reaction_velocity[-10:]
            
            # Determine trend
            if len(self.reaction_velocity) >= 3:
                recent_avg = sum(self.reaction_velocity[-3:]) / 3
                older_avg = sum(self.reaction_velocity[:-3]) / max(1, len(self.reaction_velocity) - 3)
                
                if recent_avg > older_avg * 1.3:
                    trend = "accelerating"
                elif recent_avg < older_avg * 0.7:
                    trend = "decelerating"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            return {
                "rate": round(rate, 2),
                "trend": trend,
                "intensity": intensity
            }
        
        except Exception as e:
            return {"rate": 0, "trend": "stable", "intensity": "low"}
    
    def _interpret_velocity(self, velocity: Dict[str, Any]) -> str:
        """Convert velocity data to human insight"""
        rate = velocity.get("rate", 0)
        trend = velocity.get("trend", "stable")
        intensity = velocity.get("intensity", "low")
        
        if intensity == "high" and trend == "accelerating":
            return "🔥 Very high engagement - audience very active"
        elif intensity == "high":
            return "📈 High engagement - strong audience response"
        elif intensity == "medium" and trend == "accelerating":
            return "📊 Growing engagement"
        elif intensity == "medium":
            return "✓ Moderate engagement"
        elif trend == "decelerating":
            return "📉 Declining engagement"
        else:
            return "➡️ Low/steady engagement"
    
    def _calculate_engagement_trend(self) -> Dict[str, Any]:
        """
        Analyze trend from historical engagement scores
        """
        if len(self.engagement_history) < 3:
            return {"direction": "unknown", "confidence": 0, "trend": "insufficient_data"}
        
        recent = self.engagement_history[-5:]
        
        # Linear regression (simple)
        n = len(recent)
        x_mean = (n - 1) / 2
        y_mean = sum(recent) / n
        
        numerator = sum((i - x_mean) * (recent[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        slope = numerator / denominator if denominator != 0 else 0
        
        # Interpret slope
        if slope > 2:
            direction = "improving"
            confidence = min(90, int(abs(slope) * 10))
        elif slope < -2:
            direction = "declining"
            confidence = min(90, int(abs(slope) * 10))
        else:
            direction = "stable"
            confidence = 70
        
        return {
            "direction": direction,
            "confidence": confidence,
            "slope": round(slope, 2),
            "data_points": n
        }
    
    def _update_history(self, score: int):
        """Update engagement score history"""
        self.engagement_history.append(score)
        if len(self.engagement_history) > 10:
            self.engagement_history = self.engagement_history[-10:]
    
    def _generate_smart_alerts(
        self, 
        counts: Dict[str, int], 
        thresholds: Dict[str, int],
        velocity: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate smart alerts with cooldown to prevent spam
        """
        alerts = []
        now = datetime.now()
        
        im_lost = counts.get("im_lost", 0)
        slow_down = counts.get("slow_down", 0)
        speed_up = counts.get("speed_up", 0)
        show_code = counts.get("show_code", 0)
        
        # Check cooldowns
        def can_alert(alert_type: str) -> bool:
            if alert_type not in self.last_alert_time:
                return True
            elapsed = (now - self.last_alert_time[alert_type]).total_seconds()
            return elapsed > self.alert_cooldown
        
        # Critical alerts (always show)
        if im_lost >= thresholds["im_lost_critical"]:
            alerts.append({
                "type": "critical",
                "icon": "🚨",
                "title": "CRITICAL: You Lost the Room",
                "message": f"{im_lost} people are confused",
                "action": "STOP and clarify immediately",
                "priority": 1
            })
            self.last_alert_time["im_lost"] = now
        
        # Warning alerts (with cooldown)
        if slow_down >= thresholds["slow_down_critical"] and can_alert("slow_down"):
            alerts.append({
                "type": "warning",
                "icon": "⚠️",
                "title": "Slow Down",
                "message": f"{slow_down} requests to reduce pace",
                "action": "Reduce speaking speed by 25%",
                "priority": 2
            })
            self.last_alert_time["slow_down"] = now
        
        # Info alerts (with cooldown)
        if show_code >= thresholds["show_code_demand"] and can_alert("show_code"):
            alerts.append({
                "type": "opportunity",
                "icon": "💻",
                "title": "Code Demo Requested",
                "message": f"{show_code} people want to see code",
                "action": "Perfect time for live coding",
                "priority": 3
            })
            self.last_alert_time["show_code"] = now
        
        if speed_up >= thresholds["speed_up_threshold"] and can_alert("speed_up"):
            alerts.append({
                "type": "info",
                "icon": "🚀",
                "title": "Speed Up",
                "message": f"{speed_up} requests to increase pace",
                "action": "Audience ready for faster pace",
                "priority": 4
            })
            self.last_alert_time["speed_up"] = now
        
        # Velocity-based alert
        if velocity["intensity"] == "high" and velocity["trend"] == "accelerating":
            if can_alert("velocity_high"):
                alerts.append({
                    "type": "info",
                    "icon": "🔥",
                    "title": "High Engagement",
                    "message": "Audience very active right now",
                    "action": "Great time for Q&A or interaction",
                    "priority": 5
                })
                self.last_alert_time["velocity_high"] = now
        
        # Sort by priority
        alerts.sort(key=lambda x: x["priority"])
        
        return alerts
    
    async def get_pacing_trend(self) -> Dict[str, Any]:
        """Get detailed pacing trend analysis"""
        return self._calculate_engagement_trend()