from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from datetime import datetime, timedelta
import json
import asyncio
import os

from agents.pacing_agent import PacingAgent
from agents.qa_grouper_agent import QAGrouperAgent
from agents.sentiment_agent import SentimentAgent

app = FastAPI(
    title="Real-Time Feedback API with AI Agents",
    version="4.0",
    description="Ultra-optimized real-time presentation feedback with Gemini AI"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pacing_agent = PacingAgent()
qa_grouper_agent = QAGrouperAgent()
sentiment_agent = SentimentAgent()

class RoomManager:
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.active_connections: List[WebSocket] = []
        self.reactions_buffer: List[Dict] = []
        self.questions: List[Dict] = []
        self.active_poll: Dict = None
        self.created_at = datetime.now()
        
        self.last_pacing_analysis = None
        self.last_qa_analysis = None
        self.last_sentiment_analysis = None
        self.last_ai_run = None
        self.ai_analysis_task = None
        self.ai_analysis_interval = 8
        
        self.heatmap_buckets = self._initialize_heatmap_buckets()
        self.last_heatmap_update = datetime.now()
        
        self.metrics = {
            "total_reactions": 0,
            "total_questions": 0,
            "peak_connections": 0,
            "ai_analyses_run": 0
        }
    
    def _initialize_heatmap_buckets(self):
        buckets = []
        now = datetime.now()
        for i in range(12):
            bucket_time = now - timedelta(minutes=i * 5)
            buckets.append({
                "time": bucket_time,
                "label": f"-{i*5}m" if i > 0 else "Now",
                "reactions": 0,
                "speed_up": 0,
                "slow_down": 0,
                "show_code": 0,
                "im_lost": 0
            })
        return list(reversed(buckets))
    
    def _update_heatmap_bucket(self, reaction_type: str):
        now = datetime.now()
        
        if (now - self.last_heatmap_update).total_seconds() > 300:
            self.heatmap_buckets.pop(0)
            self.heatmap_buckets.append({
                "time": now,
                "label": "Now",
                "reactions": 0,
                "speed_up": 0,
                "slow_down": 0,
                "show_code": 0,
                "im_lost": 0
            })
            for i, bucket in enumerate(self.heatmap_buckets):
                minutes_ago = (len(self.heatmap_buckets) - 1 - i) * 5
                bucket["label"] = f"-{minutes_ago}m" if minutes_ago > 0 else "Now"
            self.last_heatmap_update = now
        
        current_bucket = self.heatmap_buckets[-1]
        current_bucket["reactions"] += 1
        if reaction_type in current_bucket:
            current_bucket[reaction_type] += 1
    
    def get_heatmap_data(self):
        return [
            {
                "time": bucket["label"],
                "reactions": bucket["reactions"],
                "speed_up": bucket["speed_up"],
                "slow_down": bucket["slow_down"],
                "show_code": bucket["show_code"],
                "im_lost": bucket["im_lost"]
            }
            for bucket in self.heatmap_buckets
        ]
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if len(self.active_connections) > self.metrics["peak_connections"]:
            self.metrics["peak_connections"] = len(self.active_connections)
        
        print(f"✓ Client connected to room {self.room_code}. Total: {len(self.active_connections)}")
        
        if not self.ai_analysis_task or self.ai_analysis_task.done():
            self.ai_analysis_task = asyncio.create_task(self._periodic_ai_analysis())
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"✗ Client disconnected from {self.room_code}. Remaining: {len(self.active_connections)}")
        
        if len(self.active_connections) == 0 and self.ai_analysis_task:
            self.ai_analysis_task.cancel()
    
    async def broadcast(self, message: dict, exclude: WebSocket = None):
        disconnected = []
        for connection in self.active_connections:
            if connection == exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
    
    async def _periodic_ai_analysis(self):
        while len(self.active_connections) > 0:
            try:
                await asyncio.sleep(self.ai_analysis_interval)
                
                if self._should_run_analysis():
                    await self.run_ai_analysis()
                else:
                    print(f"⏭️ Skipping AI analysis for {self.room_code} (insufficient new data)")
                
            except asyncio.CancelledError:
                print(f"🛑 AI analysis task cancelled for {self.room_code}")
                break
            except Exception as e:
                print(f"Error in periodic AI analysis: {e}")
                await asyncio.sleep(5)
    
    def _should_run_analysis(self) -> bool:
        if not self.last_ai_run:
            return True
        
        time_since_last = (datetime.now() - self.last_ai_run).total_seconds()
        if time_since_last < 5:
            return False
        
        recent_reactions = self.get_recent_reactions(30)
        recent_questions = [q for q in self.questions if 
                          (datetime.now() - datetime.fromisoformat(q['timestamp'])).total_seconds() < 30]
        
        return (
            len(recent_reactions) >= 2 or 
            len(recent_questions) >= 1 or 
            time_since_last > 30
        )
    
    async def run_ai_analysis(self):
        try:
            self.last_ai_run = datetime.now()
            self.metrics["ai_analyses_run"] += 1
            
            print(f"🤖 Starting AI analysis for room {self.room_code}...")
            
            reaction_counts = self.get_reaction_counts(60)
            recent_reactions = self.get_recent_reactions(60)
            questions_data = self.questions[-20:]
            
            tasks = []
            
            pacing_data = {
                "reaction_counts": reaction_counts,
                "recent_reactions": recent_reactions,
                "time_window": 60
            }
            tasks.append(pacing_agent.analyze(pacing_data))
            
            if len(self.questions) >= 3:
                qa_data = {"questions": questions_data}
                tasks.append(qa_grouper_agent.analyze(qa_data))
            else:
                tasks.append(asyncio.create_task(self._placeholder_qa_result()))
            
            if len(self.questions) > 0 or sum(reaction_counts.values()) > 0:
                sentiment_data = {
                    "questions": questions_data,
                    "reaction_counts": reaction_counts,
                    "recent_reactions": recent_reactions
                }
                tasks.append(sentiment_agent.analyze(sentiment_data))
            else:
                tasks.append(asyncio.create_task(self._placeholder_sentiment_result()))
            
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=10.0
            )
            
            self.last_pacing_analysis = results[0] if not isinstance(results[0], Exception) else None
            self.last_qa_analysis = results[1] if not isinstance(results[1], Exception) else None
            self.last_sentiment_analysis = results[2] if not isinstance(results[2], Exception) else None
            
            insights_data = {
                "pacing": self.last_pacing_analysis,
                "qa_grouping": self.last_qa_analysis,
                "sentiment": self.last_sentiment_analysis
            }
            
            await self.broadcast({
                "type": "ai_insights",
                "data": insights_data,
                "timestamp": datetime.now().isoformat()
            })
            
            print(f"✓ AI Analysis completed for {self.room_code} ({self.metrics['ai_analyses_run']} total)")
            
        except asyncio.TimeoutError:
            print(f"⏰ AI Analysis timeout for {self.room_code}")
        except Exception as e:
            print(f"❌ AI Analysis error for {self.room_code}: {e}")
    
    async def _placeholder_qa_result(self):
        return {
            "agent": "Q&A Grouper Agent",
            "status": "insufficient_data",
            "themes": [],
            "total_questions": len(self.questions),
            "total_themes": 0
        }
    
    async def _placeholder_sentiment_result(self):
        return {
            "agent": "Sentiment Agent",
            "overall_sentiment": "neutral",
            "dominant_emotion": "unknown",
            "confidence": 0,
            "audience_mood": "😐 Waiting for data...",
            "recommendations": []
        }
    
    def add_reaction(self, reaction_type: str, user_id: str = None):
        reaction = {
            "type": reaction_type,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id or f"anon-{datetime.now().timestamp()}",
            "room_code": self.room_code
        }
        self.reactions_buffer.append(reaction)
        self.metrics["total_reactions"] += 1
        
        self._update_heatmap_bucket(reaction_type)
        
        if len(self.reactions_buffer) > 300:
            self.reactions_buffer = self.reactions_buffer[-300:]
        
        if reaction_type == "im_lost" and self.get_reaction_counts(10).get("im_lost", 0) >= 3:
            asyncio.create_task(self.run_ai_analysis())
        
        return reaction
    
    def add_question(self, question_text: str, user_id: str = None):
        question = {
            "id": f"q-{self.room_code}-{len(self.questions) + 1}-{datetime.now().timestamp()}",
            "text": question_text,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id or f"anon-{datetime.now().timestamp()}",
            "upvotes": 0,
            "upvoted_by": [],
            "room_code": self.room_code
        }
        self.questions.append(question)
        self.metrics["total_questions"] += 1
        
        if len(self.questions) > 100:
            self.questions = self.questions[-100:]
        
        asyncio.create_task(self.run_ai_analysis())
        
        return question
    
    def upvote_question(self, question_id: str, user_id: str):
        for question in self.questions:
            if question["id"] == question_id:
                if user_id not in question.get("upvoted_by", []):
                    question["upvotes"] = question.get("upvotes", 0) + 1
                    if "upvoted_by" not in question:
                        question["upvoted_by"] = []
                    question["upvoted_by"].append(user_id)
                    return question
        return None
    
    def create_poll(self, poll_text: str, duration: int = 30):
        poll_id = f"poll-{self.room_code}-{datetime.now().timestamp()}"
        poll = {
            "id": poll_id,
            "text": poll_text,
            "active": True,
            "yes_votes": 0,
            "no_votes": 0,
            "voted_users": [],
            "started_at": datetime.now().isoformat(),
            "duration": duration,
            "room_code": self.room_code
        }
        self.active_poll = poll
        return poll
    
    def get_recent_reactions(self, seconds: int = 30):
        now = datetime.now()
        recent = []
        for reaction in self.reactions_buffer:
            try:
                timestamp = datetime.fromisoformat(reaction["timestamp"])
                diff = (now - timestamp).total_seconds()
                if diff <= seconds:
                    recent.append(reaction)
            except:
                continue
        return recent
    
    def get_reaction_counts(self, seconds: int = 30):
        recent = self.get_recent_reactions(seconds)
        counts = {
            "speed_up": 0,
            "slow_down": 0,
            "show_code": 0,
            "im_lost": 0
        }
        for reaction in recent:
            reaction_type = reaction["type"]
            if reaction_type in counts:
                counts[reaction_type] += 1
        return counts
    
    def get_stats(self):
        return {
            "room_code": self.room_code,
            "active_connections": len(self.active_connections),
            "metrics": self.metrics,
            "created_at": self.created_at.isoformat(),
            "age_minutes": (datetime.now() - self.created_at).total_seconds() / 60,
            "ai_analyses_run": self.metrics["ai_analyses_run"]
        }

class GlobalConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, RoomManager] = {}
        self._cleanup_task = None
    
    def start_cleanup_task(self):
        if not self._cleanup_task:
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
    
    async def _periodic_cleanup(self):
        while True:
            try:
                await asyncio.sleep(300)
                self.cleanup_empty_rooms()
            except Exception as e:
                print(f"Error in cleanup task: {e}")
    
    def create_room(self, room_code: str) -> RoomManager:
        if room_code not in self.rooms:
            self.rooms[room_code] = RoomManager(room_code)
            print(f"🏠 Room created: {room_code}")
        return self.rooms[room_code]
    
    def get_room(self, room_code: str) -> RoomManager:
        if room_code not in self.rooms:
            return self.create_room(room_code)
        return self.rooms[room_code]
    
    def room_exists(self, room_code: str) -> bool:
        return room_code in self.rooms
    
    def delete_room(self, room_code: str):
        if room_code in self.rooms:
            room = self.rooms[room_code]
            if len(room.active_connections) == 0:
                del self.rooms[room_code]
                print(f"🗑️ Room deleted: {room_code}")
    
    def cleanup_empty_rooms(self):
        empty_rooms = [code for code, room in self.rooms.items() 
                      if len(room.active_connections) == 0]
        for code in empty_rooms:
            self.delete_room(code)
        if empty_rooms:
            print(f"🧹 Cleaned {len(empty_rooms)} empty rooms")

global_manager = GlobalConnectionManager()

@app.on_event("startup")
async def startup_event():
    print("🚀 Real-Time Feedback API with AI Agents Started!")
    print("🤖 AI Agents initialized:")
    print("  - Pacing Agent (Gemini)")
    print("  - Q&A Grouper Agent (Gemini)")
    print("  - Sentiment Agent (Gemini)")
    print("📡 WebSocket endpoint: ws://localhost:8000/ws/{room_code}")
    
    global_manager.start_cleanup_task()

@app.get("/")
async def root():
    return {
        "message": "Real-Time Feedback API with AI Agents (Ultra-Optimized)",
        "version": "4.0",
        "status": "running",
        "total_rooms": len(global_manager.rooms),
        "ai_agents": [
            "Pacing Agent (Gemini)",
            "Q&A Grouper Agent (Gemini)",
            "Sentiment Agent (Gemini)"
        ],
        "optimizations": [
            "Reduced AI analysis interval to 8s",
            "Persistent heatmap buckets",
            "Relaxed trigger thresholds",
            "Faster response times"
        ]
    }

@app.get("/health")
async def health_check():
    total_connections = sum(len(room.active_connections) for room in global_manager.rooms.values())
    total_analyses = sum(room.metrics["ai_analyses_run"] for room in global_manager.rooms.values())
    
    return {
        "status": "healthy",
        "total_rooms": len(global_manager.rooms),
        "total_connections": total_connections,
        "total_ai_analyses": total_analyses,
        "ai_agents_active": True
    }

@app.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    room_code = room_code.upper()
    room = global_manager.get_room(room_code)
    
    await room.connect(websocket)
    
    try:
        await websocket.send_json({
            "type": "connected",
            "message": f"Connected to room {room_code}",
            "room_code": room_code,
            "timestamp": datetime.now().isoformat()
        })
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "reaction":
                reaction_type = data.get("reaction")
                user_id = data.get("user_id")
                
                if reaction_type in ["speed_up", "slow_down", "show_code", "im_lost"]:
                    reaction = room.add_reaction(reaction_type, user_id)
                    
                    await room.broadcast({
                        "type": "reaction",
                        "data": reaction,
                        "counts": room.get_reaction_counts(),
                        "heatmap_data": room.get_heatmap_data()
                    })
            
            elif message_type == "question":
                question_text = data.get("text")
                user_id = data.get("user_id")
                
                if question_text and question_text.strip():
                    question = room.add_question(question_text, user_id)
                    
                    await room.broadcast({
                        "type": "question",
                        "data": question
                    })
            
            elif message_type == "upvote_question":
                question_id = data.get("question_id")
                user_id = data.get("user_id")
                
                if question_id and user_id:
                    updated_question = room.upvote_question(question_id, user_id)
                    
                    if updated_question:
                        await room.broadcast({
                            "type": "question_upvote",
                            "data": updated_question
                        })
            
            elif message_type == "create_poll":
                poll_text = data.get("text", "Do you agree?")
                duration = data.get("duration", 30)
                
                poll = room.create_poll(poll_text, duration)
                
                await room.broadcast({
                    "type": "poll_created",
                    "data": poll
                })
                
                async def auto_close():
                    await asyncio.sleep(duration)
                    if room.active_poll and room.active_poll.get("id") == poll["id"]:
                        room.active_poll["active"] = False
                        await room.broadcast({
                            "type": "poll_closed",
                            "data": room.active_poll
                        })
                
                asyncio.create_task(auto_close())
            
            elif message_type == "vote_poll":
                poll_id = data.get("poll_id")
                user_id = data.get("user_id")
                vote = data.get("vote")
                
                if poll_id and vote in ["yes", "no"] and room.active_poll:
                    if room.active_poll.get("id") == poll_id and room.active_poll.get("active"):
                        if user_id not in room.active_poll.get("voted_users", []):
                            if vote == "yes":
                                room.active_poll["yes_votes"] = room.active_poll.get("yes_votes", 0) + 1
                            else:
                                room.active_poll["no_votes"] = room.active_poll.get("no_votes", 0) + 1
                            
                            room.active_poll["voted_users"].append(user_id)
                            
                            await room.broadcast({
                                "type": "poll_vote",
                                "data": room.active_poll
                            })
            
            elif message_type == "get_stats":
                await websocket.send_json({
                    "type": "stats",
                    "counts": room.get_reaction_counts(),
                    "total_questions": len(room.questions),
                    "recent_questions": room.questions[-10:],
                    "recent_reactions": room.get_recent_reactions(60),
                    "active_connections": len(room.active_connections),
                    "active_poll": room.active_poll if room.active_poll and room.active_poll.get("active") else None,
                    "room_code": room_code,
                    "heatmap_data": room.get_heatmap_data(),
                    "ai_insights": {
                        "pacing": room.last_pacing_analysis,
                        "qa_grouping": room.last_qa_analysis,
                        "sentiment": room.last_sentiment_analysis
                    }
                })
            
            elif message_type == "request_ai_analysis":
                asyncio.create_task(room.run_ai_analysis())
            
            elif message_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
    
    except WebSocketDisconnect:
        room.disconnect(websocket)
        if len(room.active_connections) == 0:
            global_manager.delete_room(room_code)
    except Exception as e:
        print(f"❌ WebSocket error in {room_code}: {e}")
        room.disconnect(websocket)

@app.get("/api/rooms/{room_code}/stats")
async def get_room_stats(room_code: str):
    room_code = room_code.upper()
    
    if not global_manager.room_exists(room_code):
        return {"error": "Room not found"}, 404
    
    room = global_manager.get_room(room_code)
    return room.get_stats()

@app.get("/api/rooms/{room_code}/ai-insights")
async def get_ai_insights(room_code: str):
    room_code = room_code.upper()
    
    if not global_manager.room_exists(room_code):
        return {"error": "Room not found"}, 404
    
    room = global_manager.get_room(room_code)
    
    return {
        "room_code": room_code,
        "pacing_analysis": room.last_pacing_analysis,
        "qa_analysis": room.last_qa_analysis,
        "sentiment_analysis": room.last_sentiment_analysis,
        "last_analysis_time": room.last_ai_run.isoformat() if room.last_ai_run else None,
        "total_analyses": room.metrics["ai_analyses_run"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")