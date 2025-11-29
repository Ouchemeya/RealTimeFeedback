from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from datetime import datetime
import json
import asyncio

app = FastAPI(title="Real-Time Feedback API with Rooms")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RoomManager:
    """Gère une room spécifique avec ses connexions et données"""
    def __init__(self, room_code: str):
        self.room_code = room_code
        self.active_connections: List[WebSocket] = []
        self.reactions_buffer: List[Dict] = []
        self.questions: List[Dict] = []
        self.active_poll: Dict = None
        self.created_at = datetime.now()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ Client connected to room {self.room_code}. Total in room: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"❌ Client disconnected from room {self.room_code}. Remaining: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Envoie un message à tous les clients de cette room"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
    
    def add_reaction(self, reaction_type: str, user_id: str = None):
        """Ajoute une réaction dans cette room"""
        reaction = {
            "type": reaction_type,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id or "anonymous",
            "room_code": self.room_code
        }
        self.reactions_buffer.append(reaction)
        
        if len(self.reactions_buffer) > 100:
            self.reactions_buffer = self.reactions_buffer[-100:]
        
        print(f"📊 Reaction in {self.room_code}: {reaction_type}")
        return reaction
    
    def add_question(self, question_text: str, user_id: str = None):
        """Ajoute une question dans cette room"""
        question = {
            "id": f"q-{self.room_code}-{len(self.questions) + 1}-{datetime.now().timestamp()}",
            "text": question_text,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id or "anonymous",
            "upvotes": 0,
            "upvoted_by": [],
            "room_code": self.room_code
        }
        self.questions.append(question)
        print(f"❓ Question in {self.room_code}: {question_text[:50]}...")
        return question
    
    def upvote_question(self, question_id: str, user_id: str):
        """Vote pour une question dans cette room"""
        for question in self.questions:
            if question["id"] == question_id:
                if user_id not in question.get("upvoted_by", []):
                    question["upvotes"] = question.get("upvotes", 0) + 1
                    if "upvoted_by" not in question:
                        question["upvoted_by"] = []
                    question["upvoted_by"].append(user_id)
                    print(f"👍 Question upvoted in {self.room_code}: {question_id}")
                    return question
                else:
                    print(f"⚠️ User already upvoted in {self.room_code}")
                    return None
        return None
    
    def create_poll(self, poll_text: str, duration: int = 30):
        """Crée un poll standalone"""
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
        print(f"📊 Poll created in {self.room_code}: {poll_text}")
        return poll
    
    def get_recent_reactions(self, seconds: int = 30):
        """Récupère les réactions récentes de cette room"""
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
        """Compte les réactions par type dans cette room"""
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

class GlobalConnectionManager:
    """Gère toutes les rooms de l'application"""
    def __init__(self):
        self.rooms: Dict[str, RoomManager] = {}
    
    def create_room(self, room_code: str) -> RoomManager:
        """Crée une nouvelle room"""
        if room_code not in self.rooms:
            self.rooms[room_code] = RoomManager(room_code)
            print(f"🎯 Room created: {room_code}")
        return self.rooms[room_code]
    
    def get_room(self, room_code: str) -> RoomManager:
        """Récupère une room existante ou la crée"""
        if room_code not in self.rooms:
            return self.create_room(room_code)
        return self.rooms[room_code]
    
    def room_exists(self, room_code: str) -> bool:
        """Vérifie si une room existe"""
        return room_code in self.rooms
    
    def delete_room(self, room_code: str):
        """Supprime une room vide"""
        if room_code in self.rooms:
            room = self.rooms[room_code]
            if len(room.active_connections) == 0:
                del self.rooms[room_code]
                print(f"🗑️ Room deleted: {room_code}")
    
    def cleanup_empty_rooms(self):
        """Nettoie les rooms vides"""
        empty_rooms = [code for code, room in self.rooms.items() if len(room.active_connections) == 0]
        for code in empty_rooms:
            self.delete_room(code)

# Instance globale du gestionnaire
global_manager = GlobalConnectionManager()

@app.get("/")
async def root():
    return {
        "message": "Real-Time Feedback API with Rooms & Standalone Polls",
        "version": "2.2",
        "status": "running",
        "total_rooms": len(global_manager.rooms),
        "endpoints": {
            "websocket": "ws://localhost:8000/ws/{room_code}",
            "stats": "/api/rooms/{room_code}/stats",
            "rooms": "/api/rooms"
        },
        "features": [
            "Multi-room support",
            "Real-time reactions",
            "Question upvoting",
            "Standalone live polls with yes/no voting",
            "Auto-closing polls (30s)"
        ]
    }

@app.get("/health")
async def health_check():
    total_connections = sum(len(room.active_connections) for room in global_manager.rooms.values())
    return {
        "status": "healthy",
        "total_rooms": len(global_manager.rooms),
        "total_connections": total_connections,
        "rooms": {
            code: {
                "connections": len(room.active_connections),
                "reactions": len(room.reactions_buffer),
                "questions": len(room.questions),
                "has_active_poll": room.active_poll is not None and room.active_poll.get("active", False)
            }
            for code, room in global_manager.rooms.items()
        }
    }

@app.websocket("/ws/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
    """WebSocket endpoint pour une room spécifique"""
    room_code = room_code.upper()
    room = global_manager.get_room(room_code)
    
    await room.connect(websocket)
    
    try:
        # Message de connexion initial
        await websocket.send_json({
            "type": "connected",
            "message": f"Successfully connected to room {room_code}",
            "room_code": room_code,
            "timestamp": datetime.now().isoformat()
        })
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            print(f"📨 {room_code} received: {message_type}")
            
            if message_type == "reaction":
                reaction_type = data.get("reaction")
                user_id = data.get("user_id")
                
                if reaction_type in ["speed_up", "slow_down", "show_code", "im_lost"]:
                    reaction = room.add_reaction(reaction_type, user_id)
                    
                    await room.broadcast({
                        "type": "reaction",
                        "data": reaction,
                        "counts": room.get_reaction_counts()
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
                
                if question_id:
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
                
                # Auto-close poll after duration
                async def auto_close_poll():
                    await asyncio.sleep(duration)
                    if room.active_poll and room.active_poll.get("id") == poll["id"]:
                        room.active_poll["active"] = False
                        await room.broadcast({
                            "type": "poll_closed",
                            "data": room.active_poll
                        })
                
                asyncio.create_task(auto_close_poll())
            
            elif message_type == "vote_poll":
                poll_id = data.get("poll_id")
                user_id = data.get("user_id")
                vote = data.get("vote")  # "yes" or "no"
                
                if poll_id and vote in ["yes", "no"] and room.active_poll:
                    if room.active_poll.get("id") == poll_id and room.active_poll.get("active"):
                        if user_id not in room.active_poll.get("voted_users", []):
                            # Update vote count
                            if vote == "yes":
                                room.active_poll["yes_votes"] = room.active_poll.get("yes_votes", 0) + 1
                            else:
                                room.active_poll["no_votes"] = room.active_poll.get("no_votes", 0) + 1
                            
                            room.active_poll["voted_users"].append(user_id)
                            
                            # Broadcast the updated poll to all clients
                            await room.broadcast({
                                "type": "poll_vote",
                                "poll_id": poll_id,
                                "vote": vote,
                                "user_id": user_id,
                                "data": room.active_poll
                            })
            
            elif message_type == "get_stats":
                await websocket.send_json({
                    "type": "stats",
                    "counts": room.get_reaction_counts(),
                    "total_questions": len(room.questions),
                    "recent_questions": room.questions[-10:] if room.questions else [],
                    "recent_reactions": room.get_recent_reactions(60),
                    "active_connections": len(room.active_connections),
                    "active_poll": room.active_poll if room.active_poll and room.active_poll.get("active") else None,
                    "room_code": room_code
                })
            
            elif message_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "room_code": room_code,
                    "timestamp": datetime.now().isoformat()
                })
    
    except WebSocketDisconnect:
        room.disconnect(websocket)
        # Nettoyer la room si elle est vide
        if len(room.active_connections) == 0:
            global_manager.delete_room(room_code)
    except Exception as e:
        print(f"❌ WebSocket error in {room_code}: {e}")
        room.disconnect(websocket)

@app.get("/api/rooms")
async def get_rooms():
    """Liste toutes les rooms actives"""
    return {
        "rooms": [
            {
                "code": code,
                "connections": len(room.active_connections),
                "reactions": len(room.reactions_buffer),
                "questions": len(room.questions),
                "has_active_poll": room.active_poll is not None and room.active_poll.get("active", False),
                "created_at": room.created_at.isoformat()
            }
            for code, room in global_manager.rooms.items()
        ],
        "total": len(global_manager.rooms)
    }

@app.get("/api/rooms/{room_code}/stats")
async def get_room_stats(room_code: str):
    """Statistiques d'une room spécifique"""
    room_code = room_code.upper()
    
    if not global_manager.room_exists(room_code):
        return {"error": "Room not found"}, 404
    
    room = global_manager.get_room(room_code)
    
    return {
        "room_code": room_code,
        "reaction_counts": room.get_reaction_counts(),
        "total_questions": len(room.questions),
        "recent_reactions": room.get_recent_reactions(60),
        "recent_questions": room.questions[-10:] if room.questions else [],
        "active_connections": len(room.active_connections),
        "active_poll": room.active_poll if room.active_poll and room.active_poll.get("active") else None,
        "created_at": room.created_at.isoformat()
    }

@app.get("/api/rooms/{room_code}/exists")
async def check_room_exists(room_code: str):
    """Vérifie si une room existe"""
    room_code = room_code.upper()
    return {
        "exists": global_manager.room_exists(room_code),
        "room_code": room_code
    }

@app.on_event("startup")
async def startup_event():
    print("🚀 Real-Time Feedback API with Rooms & Standalone Polls Started!")
    print("📡 WebSocket endpoint: ws://localhost:8000/ws/{room_code}")
    print("🌐 HTTP endpoint: http://localhost:8000")
    print("🎯 Multi-room support enabled")
    print("📊 Standalone polling feature enabled")

@app.on_event("shutdown")
async def shutdown_event():
    print("👋 Shutting down Real-Time Feedback API")

# Nettoyage périodique des rooms vides
@app.on_event("startup")
async def start_cleanup_task():
    async def cleanup_task():
        while True:
            await asyncio.sleep(300)  # Toutes les 5 minutes
            global_manager.cleanup_empty_rooms()
            print(f"🧹 Cleanup done. Active rooms: {len(global_manager.rooms)}")
    
    asyncio.create_task(cleanup_task())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)