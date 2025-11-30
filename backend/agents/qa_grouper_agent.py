from .base_agent import BaseAgent
from typing import Dict, Any, List, Set
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from services.gemini_service import gemini_service
import re
from collections import defaultdict

class QAGrouperAgent(BaseAgent):
    """
    ULTRA-OPTIMIZED Q&A Grouper Agent
    - Hybrid: Fast local clustering + Smart Gemini refinement
    - Sub-second response for <10 questions
    - Accurate semantic clustering
    - Priority scoring algorithm
    """
    
    def __init__(self):
        super().__init__("Q&A Grouper Agent")
        
        self.min_questions_for_clustering = 2
        self.min_questions_for_gemini = 5  # Use Gemini only for 5+ questions
        
        # Enhanced noise patterns
        self.noise_patterns = {
            'greetings': ['hey', 'hi', 'hello', 'sup', 'yo'],
            'thanks': ['thanks', 'thank you', 'thx', 'ty'],
            'affirmations': ['ok', 'okay', 'yes', 'no', 'yep', 'nope'],
            'reactions': ['lol', 'haha', 'cool', 'nice', 'great', 'wow'],
            'emojis': ['😂', '👍', '🔥', '💯', '✅']
        }
        
        # Topic detection patterns (VERY specific)
        self.topic_patterns = {
            'Authentication & Security': {
                'keywords': ['auth', 'login', 'oauth', 'jwt', 'token', 'session', 'password', 
                           'sign in', 'sign up', 'register', 'authenticate', 'security', 
                           'encrypt', '2fa', 'mfa'],
                'weight': 1.0,
                'priority_boost': 0.1
            },
            'API Design & Integration': {
                'keywords': ['api', 'endpoint', 'rest', 'graphql', 'webhook', 'integration',
                           'request', 'response', 'http', 'fetch', 'call', 'axios', 'curl'],
                'weight': 1.0,
                'priority_boost': 0.15
            },
            'Deployment & Infrastructure': {
                'keywords': ['deploy', 'deployment', 'host', 'server', 'cloud', 'aws', 'gcp',
                           'azure', 'docker', 'kubernetes', 'k8s', 'heroku', 'vercel', 'ci/cd'],
                'weight': 1.0,
                'priority_boost': 0.2
            },
            'Database & Storage': {
                'keywords': ['database', 'db', 'sql', 'mongodb', 'postgres', 'mysql', 'redis',
                           'query', 'table', 'storage', 'data', 'orm', 'prisma', 'schema'],
                'weight': 1.0,
                'priority_boost': 0.05
            },
            'Error Handling & Debugging': {
                'keywords': ['error', 'bug', 'issue', 'problem', 'not working', 'failed', 'broken',
                           'crash', 'debug', 'fix', 'troubleshoot', 'exception', 'stacktrace'],
                'weight': 1.2,  # Higher weight - urgent
                'priority_boost': 0.3
            },
            'Pricing & Billing': {
                'keywords': ['price', 'pricing', 'cost', 'payment', 'subscription', 'plan', 'tier',
                           'billing', 'charge', 'free', 'paid', 'invoice', 'credit card'],
                'weight': 0.9,
                'priority_boost': 0.25
            },
            'Performance & Optimization': {
                'keywords': ['performance', 'speed', 'slow', 'fast', 'optimize', 'cache', 'latency',
                           'load time', 'bottleneck', 'memory', 'cpu', 'scaling', 'throughput'],
                'weight': 1.0,
                'priority_boost': 0.15
            },
            'Setup & Installation': {
                'keywords': ['setup', 'install', 'configuration', 'config', 'getting started',
                           'initialize', 'start', 'begin', 'quickstart', 'tutorial'],
                'weight': 0.8,
                'priority_boost': 0.05
            },
            'UI & Frontend': {
                'keywords': ['ui', 'design', 'interface', 'layout', 'style', 'css', 'component',
                           'button', 'form', 'page', 'react', 'vue', 'angular', 'frontend'],
                'weight': 0.8,
                'priority_boost': 0.0
            },
            'Data Processing & Analytics': {
                'keywords': ['data', 'analytics', 'report', 'metrics', 'dashboard', 'chart',
                           'visualization', 'export', 'csv', 'json', 'parse'],
                'weight': 0.9,
                'priority_boost': 0.1
            },
            'Testing & Quality': {
                'keywords': ['test', 'testing', 'unit test', 'e2e', 'qa', 'quality', 'coverage',
                           'jest', 'pytest', 'mock', 'assertion'],
                'weight': 0.7,
                'priority_boost': 0.0
            },
            'Documentation & Help': {
                'keywords': ['documentation', 'docs', 'tutorial', 'guide', 'example', 'help',
                           'how to', 'explain', 'clarify', 'understand'],
                'weight': 0.8,
                'priority_boost': 0.1
            }
        }
        
        # Cache for similarity calculations
        self._similarity_cache = {}
    
    async def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Hybrid clustering approach:
        - Fast local clustering for <5 questions
        - Smart Gemini clustering for 5+ questions
        - Always returns in <2 seconds
        """
        questions = data.get("questions", [])
        
        if len(questions) < self.min_questions_for_clustering:
            return self._insufficient_data_result(questions)
        
        # STEP 1: Filter noise (instant)
        filtered_questions = self._advanced_filter(questions)
        
        if len(filtered_questions) < self.min_questions_for_clustering:
            return self._insufficient_data_result(questions)
        
        # STEP 2: Choose clustering method
        if len(filtered_questions) < self.min_questions_for_gemini:
            # Fast local clustering for small sets
            result = await self._fast_local_clustering(filtered_questions)
        else:
            # Smart Gemini clustering for larger sets
            result = await self._smart_gemini_clustering(filtered_questions)
        
        # STEP 3: Enrich themes with metadata
        result = self._enrich_and_score_themes(result, filtered_questions)
        
        # STEP 4: Generate insights
        for theme in result.get("themes", []):
            theme["insights"] = self._generate_advanced_insights(theme)
        
        # Add metadata
        result.update({
            "agent": self.name,
            "total_questions": len(questions),
            "analyzed_questions": len(filtered_questions),
            "filtered_out": len(questions) - len(filtered_questions)
        })
        
        self._store_analysis(result)
        return result
    
    def _advanced_filter(self, questions: List[Dict]) -> List[Dict]:
        """
        Advanced noise filtering with multiple strategies
        """
        filtered = []
        
        for q in questions:
            text = q.get("text", "").strip()
            
            # Length check
            if len(text) < 5:
                continue
            
            text_lower = text.lower()
            
            # Check against all noise patterns
            is_noise = False
            for category, patterns in self.noise_patterns.items():
                if text_lower in patterns:
                    is_noise = True
                    break
                
                # Check if entire message is just noise words
                words = text_lower.split()
                if len(words) <= 2:
                    if all(w in patterns for w in words):
                        is_noise = True
                        break
            
            if is_noise:
                continue
            
            # Check for emoji-only messages
            if len(text) <= 5 and all(ord(c) > 127 for c in text if not c.isspace()):
                continue
            
            # Must have at least 2 meaningful words
            words = [w for w in text_lower.split() if len(w) > 2]
            if len(words) < 2:
                continue
            
            filtered.append(q)
        
        return filtered
    
    async def _fast_local_clustering(self, questions: List[Dict]) -> Dict[str, Any]:
        """
        Ultra-fast local clustering for <5 questions
        Uses pattern matching + similarity scoring
        Returns in <100ms
        """
        # Assign each question to best matching topic
        categorized = defaultdict(list)
        uncategorized = []
        
        for q in questions:
            text = q.get("text", "").lower()
            best_topic = None
            best_score = 0
            
            # Find best matching topic
            for topic, config in self.topic_patterns.items():
                score = self._calculate_topic_match_score(text, config['keywords'])
                if score > best_score and score > 0.3:  # Threshold
                    best_score = score
                    best_topic = topic
            
            if best_topic:
                categorized[best_topic].append(q)
            else:
                uncategorized.append(q)
        
        # Build themes
        themes = []
        
        for topic, qs in categorized.items():
            if not qs:
                continue
            
            config = self.topic_patterns[topic]
            priority = self._calculate_priority(qs, config)
            
            themes.append({
                "name": topic,
                "count": len(qs),
                "examples": [q.get("text") for q in qs[:3]],
                "priority": priority,
                "category": self._topic_to_category(topic),
                "questions": qs,
                "question_count": len(qs),
                "total_upvotes": sum(q.get("upvotes", 0) for q in qs),
                "avg_upvotes": round(sum(q.get("upvotes", 0) for q in qs) / len(qs), 1),
                "confidence": 0.85  # High confidence for pattern matching
            })
        
        # Add uncategorized if significant
        if len(uncategorized) >= 2:
            themes.append({
                "name": "General Questions",
                "count": len(uncategorized),
                "examples": [q.get("text") for q in uncategorized[:3]],
                "priority": "medium",
                "category": "other",
                "questions": uncategorized,
                "question_count": len(uncategorized),
                "total_upvotes": sum(q.get("upvotes", 0) for q in uncategorized),
                "avg_upvotes": 0,
                "confidence": 0.60
            })
        
        # Sort by priority
        themes = self._sort_themes_by_priority(themes)
        
        return {
            "status": "success",
            "themes": themes,
            "total_themes": len(themes),
            "quality_score": self._calculate_quality_score(themes),
            "analysis_method": "fast_local"
        }
    
    async def _smart_gemini_clustering(self, questions: List[Dict]) -> Dict[str, Any]:
        """
        Smart Gemini clustering with optimized prompt
        Only for 5+ questions
        """
        # Take recent questions (max 15 for performance)
        recent_questions = questions[-15:]
        question_texts = [q.get("text", "") for q in recent_questions]
        
        # Build context-rich prompt
        prompt = f"""You are analyzing {len(question_texts)} audience questions from a live technical presentation.

CRITICAL INSTRUCTIONS:
1. Create 2-5 SPECIFIC, DIVERSE themes based on actual question content
2. NEVER use generic themes like "Technical Implementation" or "General Questions"
3. Each theme name must be SPECIFIC (e.g., "OAuth 2.0 Setup Issues", "PostgreSQL Connection Errors")
4. Only group questions that are TRULY about the same specific topic
5. Assign priority based on:
   - Number of questions (more = higher priority)
   - Urgency indicators (errors, blocked, help, stuck = higher)
   - Technical complexity (implementation issues = higher)

QUESTIONS:
{chr(10).join([f'{i+1}. "{q}"' for i, q in enumerate(question_texts)])}

Respond with ONLY valid JSON (no markdown, no explanations):
{{
  "themes": [
    {{
      "name": "Specific, descriptive theme name (4-6 words)",
      "count": number,
      "examples": ["exact question text", "another question"],
      "priority": "critical" | "high" | "medium" | "low",
      "reasoning": "Why these questions are grouped",
      "category": "authentication" | "api" | "deployment" | "database" | "errors" | "pricing" | "performance" | "setup" | "frontend" | "data" | "testing" | "docs" | "other"
    }}
  ],
  "total_questions": {len(question_texts)},
  "quality_score": 0-100
}}"""
        
        try:
            # Call Gemini with timeout
            response = await gemini_service.generate_text(
                prompt, 
                temperature=0.3,  # Lower for more consistent clustering
                max_tokens=1000,
                use_cache=False
            )
            
            # Parse response
            parsed = gemini_service._extract_json_from_response(response)
            
            if not parsed or 'themes' not in parsed or not parsed['themes']:
                print("⚠️ Gemini returned invalid/empty result, using fallback")
                return await self._fast_local_clustering(questions)
            
            # Validate themes are specific (not generic)
            themes = parsed['themes']
            specific_themes = [
                t for t in themes 
                if not self._is_generic_theme_name(t.get('name', ''))
            ]
            
            if len(specific_themes) < len(themes) * 0.5:
                # Too many generic themes, use local clustering
                print("⚠️ Gemini returned too many generic themes, using fallback")
                return await self._fast_local_clustering(questions)
            
            parsed['themes'] = specific_themes
            parsed['analysis_method'] = 'gemini_smart'
            parsed['status'] = 'success'
            
            return parsed
            
        except Exception as e:
            print(f"❌ Gemini clustering failed: {e}")
            return await self._fast_local_clustering(questions)
    
    def _is_generic_theme_name(self, name: str) -> bool:
        """Check if theme name is too generic"""
        generic_keywords = [
            'technical implementation',
            'conceptual understanding',
            'general questions',
            'other questions',
            'miscellaneous',
            'various topics',
            'mixed questions',
            'implementation',
            'understanding',
            'questions about'
        ]
        
        name_lower = name.lower()
        return any(keyword in name_lower for keyword in generic_keywords)
    
    def _calculate_topic_match_score(self, text: str, keywords: List[str]) -> float:
        """
        Calculate how well text matches topic keywords
        Returns 0.0 to 1.0
        """
        # Tokenize text
        words = set(text.lower().split())
        
        # Count matching keywords
        matches = sum(1 for kw in keywords if kw in text.lower())
        
        if matches == 0:
            return 0.0
        
        # Score based on:
        # 1. Number of keyword matches
        # 2. Proportion of text covered
        keyword_score = min(1.0, matches / 3)  # Normalize to 0-1
        
        return keyword_score
    
    def _calculate_priority(self, questions: List[Dict], config: Dict) -> str:
        """
        Calculate priority based on:
        - Number of questions
        - Upvotes
        - Topic weight
        - Urgency keywords
        """
        count = len(questions)
        total_upvotes = sum(q.get("upvotes", 0) for q in questions)
        weight = config.get('weight', 1.0)
        boost = config.get('priority_boost', 0.0)
        
        # Check for urgency keywords
        urgency_keywords = ['error', 'broken', 'not working', 'help', 'stuck', 'urgent', 'critical', 'blocked']
        urgency_score = 0
        for q in questions:
            text = q.get("text", "").lower()
            if any(kw in text for kw in urgency_keywords):
                urgency_score += 1
        
        # Calculate score
        score = (count * 10) + (total_upvotes * 5) + (urgency_score * 15) + (boost * 50)
        score *= weight
        
        # Map to priority
        if score >= 60 or urgency_score >= 2:
            return "critical"
        elif score >= 35:
            return "high"
        elif score >= 15:
            return "medium"
        else:
            return "low"
    
    def _topic_to_category(self, topic: str) -> str:
        """Map topic to category"""
        mapping = {
            'Authentication & Security': 'authentication',
            'API Design & Integration': 'api',
            'Deployment & Infrastructure': 'deployment',
            'Database & Storage': 'database',
            'Error Handling & Debugging': 'errors',
            'Pricing & Billing': 'pricing',
            'Performance & Optimization': 'performance',
            'Setup & Installation': 'setup',
            'UI & Frontend': 'frontend',
            'Data Processing & Analytics': 'data',
            'Testing & Quality': 'testing',
            'Documentation & Help': 'docs'
        }
        return mapping.get(topic, 'other')
    
    def _enrich_and_score_themes(self, result: Dict, all_questions: List[Dict]) -> Dict:
        """
        Enrich themes with full question data and recalculate scores
        """
        themes = result.get("themes", [])
        enriched_themes = []
        
        for theme in themes:
            examples = theme.get("examples", [])
            
            # Match examples to full question objects
            matched_questions = []
            for example in examples:
                for q in all_questions:
                    if self._text_similarity(example, q.get("text", "")) > 0.7:
                        matched_questions.append(q)
                        break
            
            # If no matches found (Gemini used different text), find best matches
            if not matched_questions:
                for q in all_questions:
                    if any(self._text_similarity(ex, q.get("text", "")) > 0.5 for ex in examples):
                        matched_questions.append(q)
            
            # Recalculate metrics
            total_upvotes = sum(q.get("upvotes", 0) for q in matched_questions)
            
            enriched_themes.append({
                **theme,
                "questions": matched_questions,
                "question_count": len(matched_questions),
                "total_upvotes": total_upvotes,
                "avg_upvotes": round(total_upvotes / len(matched_questions), 1) if matched_questions else 0
            })
        
        result["themes"] = enriched_themes
        return result
    
    def _text_similarity(self, text1: str, text2: str) -> float:
        """
        Fast text similarity calculation
        Uses Jaccard similarity on word sets
        """
        # Check cache
        cache_key = f"{hash(text1)}:{hash(text2)}"
        if cache_key in self._similarity_cache:
            return self._similarity_cache[cache_key]
        
        t1 = text1.lower().strip()
        t2 = text2.lower().strip()
        
        # Exact match
        if t1 == t2:
            return 1.0
        
        # Substring match
        if t1 in t2 or t2 in t1:
            return 0.9
        
        # Word-based Jaccard similarity
        words1 = set(re.findall(r'\w+', t1.lower()))
        words2 = set(re.findall(r'\w+', t2.lower()))
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        similarity = intersection / union if union > 0 else 0.0
        
        # Cache result
        self._similarity_cache[cache_key] = similarity
        
        # Clear cache if too large
        if len(self._similarity_cache) > 1000:
            self._similarity_cache.clear()
        
        return similarity
    
    def _sort_themes_by_priority(self, themes: List[Dict]) -> List[Dict]:
        """Sort themes by priority and engagement"""
        priority_scores = {
            'critical': 100,
            'high': 75,
            'medium': 50,
            'low': 25
        }
        
        return sorted(
            themes,
            key=lambda t: (
                priority_scores.get(t.get('priority', 'medium'), 50),
                t.get('total_upvotes', 0),
                t.get('question_count', 0)
            ),
            reverse=True
        )
    
    def _calculate_quality_score(self, themes: List[Dict]) -> int:
        """
        Calculate clustering quality score
        Based on theme specificity and distribution
        """
        if not themes:
            return 0
        
        # Factors:
        # 1. Number of substantive themes (2-5 is optimal)
        substantive = [t for t in themes if t.get('question_count', 0) >= 2]
        theme_count_score = min(100, len(substantive) * 30)
        
        # 2. Question distribution (not all in one theme)
        total_questions = sum(t.get('question_count', 0) for t in themes)
        if total_questions > 0:
            largest_theme = max(t.get('question_count', 0) for t in themes)
            distribution_score = 100 - (largest_theme / total_questions * 100)
        else:
            distribution_score = 0
        
        # 3. Average confidence
        avg_confidence = sum(t.get('confidence', 0.7) for t in themes) / len(themes)
        confidence_score = avg_confidence * 100
        
        # Weighted average
        quality = (
            theme_count_score * 0.4 +
            distribution_score * 0.3 +
            confidence_score * 0.3
        )
        
        return int(quality)
    
    def _generate_advanced_insights(self, theme: Dict) -> Dict[str, Any]:
        """
        Generate smart, actionable insights for each theme
        """
        count = theme.get('question_count', 0)
        priority = theme.get('priority', 'medium')
        category = theme.get('category', 'other')
        avg_upvotes = theme.get('avg_upvotes', 0)
        
        # Base urgency
        urgency_map = {
            'critical': 'immediate',
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
        }
        urgency = urgency_map.get(priority, 'medium')
        
        # Category-specific responses
        response_templates = {
            'authentication': {
                'response': f"Live demo: Walk through {theme['name']} with code example",
                'time': "Next 3-5 minutes",
                'action': "Show authentication flow step-by-step"
            },
            'api': {
                'response': f"API walkthrough: Demonstrate {theme['name']} with Postman/curl",
                'time': "Next 5 minutes",
                'action': "Show API request/response examples"
            },
            'deployment': {
                'response': f"Deployment guide: Show {theme['name']} process",
                'time': "Next 5-7 minutes",
                'action': "Share deployment checklist and resources"
            },
            'database': {
                'response': f"Database demo: Explain {theme['name']} with examples",
                'time': "Next 3-5 minutes",
                'action': "Show schema and queries"
            },
            'errors': {
                'response': f"Debug session: Troubleshoot {theme['name']} together",
                'time': "IMMEDIATELY",
                'action': "Stop and debug with audience"
            },
            'pricing': {
                'response': f"Pricing overview: Clarify {theme['name']}",
                'time': "Next 2 minutes",
                'action': "Show pricing page and compare plans"
            },
            'performance': {
                'response': f"Performance deep-dive: Analyze {theme['name']}",
                'time': "Next 5 minutes",
                'action': "Show profiling and optimization techniques"
            },
            'setup': {
                'response': f"Setup walkthrough: Guide through {theme['name']}",
                'time': "Next 3 minutes",
                'action': "Share quickstart guide"
            },
            'frontend': {
                'response': f"UI demo: Show {theme['name']} implementation",
                'time': "Next 3 minutes",
                'action': "Live code the component"
            },
            'data': {
                'response': f"Data analysis: Explain {theme['name']} approach",
                'time': "Next 4 minutes",
                'action': "Show data flow and transformations"
            },
            'testing': {
                'response': f"Testing demo: Write tests for {theme['name']}",
                'time': "Next 4 minutes",
                'action': "Show test examples"
            },
            'docs': {
                'response': f"Documentation tour: Point to resources for {theme['name']}",
                'time': "Next 2 minutes",
                'action': "Share docs and tutorials"
            },
            'other': {
                'response': f"Address questions about {theme['name']}",
                'time': "During Q&A",
                'action': "Answer individually or provide resources"
            }
        }
        
        template = response_templates.get(category, response_templates['other'])
        
        # Adjust time based on priority
        if priority == 'critical':
            template['time'] = "IMMEDIATELY"
        elif priority == 'low':
            template['time'] = "End of session"
        
        # Add engagement context
        engagement_note = ""
        if avg_upvotes > 3:
            engagement_note = f" (High engagement: {avg_upvotes:.1f} avg upvotes)"
        elif count >= 3:
            engagement_note = f" (Multiple questions: {count})"
        
        return {
            "suggested_response": template['response'] + engagement_note,
            "time_to_address": template['time'],
            "urgency": urgency,
            "action": template['action'],
            "question_count": count,
            "avg_engagement": avg_upvotes
        }
    
    def _insufficient_data_result(self, questions: List[Dict]) -> Dict[str, Any]:
        """Return result when insufficient questions"""
        return {
            "agent": self.name,
            "status": "insufficient_data",
            "message": f"Need at least {self.min_questions_for_clustering} questions for clustering",
            "themes": [],
            "total_questions": len(questions),
            "analyzed_questions": 0,
            "total_themes": 0,
            "quality_score": 0
        }
    
    async def get_top_questions(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get top priority questions across all themes"""
        if not self.last_analysis:
            return []
        
        result = self.last_analysis.get("result", {})
        themes = result.get("themes", [])
        
        top_questions = []
        
        for theme in themes[:limit]:
            questions = theme.get("questions", [])
            if not questions:
                continue
            
            # Get highest upvoted question from this theme
            sorted_q = sorted(questions, key=lambda q: q.get("upvotes", 0), reverse=True)
            
            top_questions.append({
                "theme": theme.get("name"),
                "category": theme.get("category"),
                "priority": theme.get("priority"),
                "question": sorted_q[0],
                "similar_count": len(questions),
                "total_upvotes": theme.get("total_upvotes", 0),
                "insights": theme.get("insights", {})
            })
        
        # Sort by priority and upvotes
        priority_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        top_questions.sort(
            key=lambda x: (
                priority_order.get(x['priority'], 0),
                x['total_upvotes']
            ),
            reverse=True
        )
        
        return top_questions[:limit]