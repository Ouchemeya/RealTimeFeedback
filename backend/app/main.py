from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from datetime import datetime
import json
import asyncio

app = FastAPI(title="Real-Time Feedback API")

# CORS middleware - FIXED to allow WebSocket connections
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

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.reactions_buffer: List[Dict] = []
        self.questions: List[Dict] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"❌ Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
    
    def add_reaction(self, reaction_type: str, user_id: str = None):
        """Store a reaction event"""
        reaction = {
            "type": reaction_type,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id or "anonymous"
        }
        self.reactions_buffer.append(reaction)
        
        # Keep only last 100 reactions
        if len(self.reactions_buffer) > 100:
            self.reactions_buffer = self.reactions_buffer[-100:]
        
        print(f"📊 Reaction added: {reaction_type} (Total: {len(self.reactions_buffer)})")
        return reaction
    
    def add_question(self, question_text: str, user_id: str = None):
        """Store a question"""
        question = {
            "id": len(self.questions) + 1,
            "text": question_text,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id or "anonymous"
        }
        self.questions.append(question)
        print(f"❓ Question added: {question_text[:50]}...")
        return question
    
    def get_recent_reactions(self, seconds: int = 30):
        """Get reactions from the last N seconds"""
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
        """Get counts of each reaction type"""
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

manager = ConnectionManager()

@app.get("/")
async def root():
    return {
        "message": "Real-Time Feedback API",
        "version": "1.0",
        "status": "running",
        "active_connections": len(manager.active_connections),
        "endpoints": {
            "websocket": "ws://localhost:8000/ws",
            "stats": "/api/stats",
            "questions": "/api/questions"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "connections": len(manager.active_connections),
        "total_reactions": len(manager.reactions_buffer),
        "total_questions": len(manager.questions)
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        # Send initial connection success message
        await websocket.send_json({
            "type": "connected",
            "message": "Successfully connected to feedback system",
            "timestamp": datetime.now().isoformat()
        })
        
        while True:
            # Receive data from client
            data = await websocket.receive_json()
            
            message_type = data.get("type")
            print(f"📨 Received: {message_type}")
            
            if message_type == "reaction":
                # Handle reaction
                reaction_type = data.get("reaction")
                user_id = data.get("user_id")
                
                if reaction_type in ["speed_up", "slow_down", "show_code", "im_lost"]:
                    reaction = manager.add_reaction(reaction_type, user_id)
                    
                    # Broadcast to all presenters
                    await manager.broadcast({
                        "type": "reaction",
                        "data": reaction,
                        "counts": manager.get_reaction_counts()
                    })
                else:
                    print(f"⚠️ Invalid reaction type: {reaction_type}")
            
            elif message_type == "question":
                # Handle question
                question_text = data.get("text")
                user_id = data.get("user_id")
                
                if question_text and question_text.strip():
                    question = manager.add_question(question_text, user_id)
                    
                    # Broadcast to all presenters
                    await manager.broadcast({
                        "type": "question",
                        "data": question
                    })
            
            elif message_type == "get_stats":
                # Send current stats to this client
                await websocket.send_json({
                    "type": "stats",
                    "counts": manager.get_reaction_counts(),
                    "total_questions": len(manager.questions),
                    "recent_questions": manager.questions[-5:] if manager.questions else []
                })
            
            elif message_type == "ping":
                # Respond to ping
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f" WebSocket error: {e}")
        manager.disconnect(websocket)

@app.get("/api/stats")
async def get_stats():
    """Get current statistics"""
    return {
        "reaction_counts": manager.get_reaction_counts(),
        "total_questions": len(manager.questions),
        "recent_reactions": manager.get_recent_reactions(60),
        "recent_questions": manager.questions[-10:] if manager.questions else [],
        "active_connections": len(manager.active_connections)
    }

@app.get("/api/questions")
async def get_questions():
    """Get all questions"""
    return {
        "questions": manager.questions,
        "total": len(manager.questions)
    }

@app.post("/api/reactions/{reaction_type}")
async def post_reaction(reaction_type: str):
    """HTTP endpoint for posting reactions (fallback)"""
    if reaction_type not in ["speed_up", "slow_down", "show_code", "im_lost"]:
        return {"error": "Invalid reaction type"}, 400
    
    reaction = manager.add_reaction(reaction_type)
    
    # Broadcast to WebSocket clients
    await manager.broadcast({
        "type": "reaction",
        "data": reaction,
        "counts": manager.get_reaction_counts()
    })
    
    return {"success": True, "reaction": reaction}

@app.on_event("startup")
async def startup_event():
    print("🚀 Real-Time Feedback API Started!")
    print("📡 WebSocket endpoint: ws://localhost:8000/ws")
    print("🌐 HTTP endpoint: http://localhost:8000")

@app.on_event("shutdown")
async def shutdown_event():
    print("👋 Shutting down Real-Time Feedback API")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)