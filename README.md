# AudiencePulse - Real-Time Audience Feedback System



## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [AI Agents](#ai-agents)
- [Installation & Setup](#installation--setup)
- [API Documentation](#api-documentation)
- [Demo Video](#demo-video)

---

## 🎯 Overview

**AudiencePulse** is a real-time feedback system designed to bridge the gap between presenters and their online audience. When presenting on platforms like Zoom, Google Meet, or Microsoft Teams, presenters often struggle to gauge audience engagement. AudiencePulse solves this by providing:

- **Real-time audience reactions** (Speed Up, Slow Down, Show Code, I'm Lost)
- **Live Q&A with upvoting** to surface the most important questions
- **AI-powered insights** using Google Gemini to analyze sentiment, pacing, and question themes
- **A second-screen dashboard** for presenters with live analytics and alerts

This project demonstrates advanced skills in:
- **Full-stack development** (Next.js + FastAPI)
- **Real-time communication** (WebSockets)
- **AI/ML integration** (Google Gemini API)
- **Agent-based architecture** (3 specialized AI agents)
- **Modern UI/UX** (Tailwind CSS, Recharts)

---

## ✨ Features

### For Audience Members
- **One-Click Reactions**: Express feedback instantly with 4 reaction buttons
- **Ask Questions**: Submit questions that other audience members can upvote
- **Live Polls**: Participate in presenter-initiated polls with real-time results
- **Clean, Distraction-Free UI**: Focus on the presentation while staying engaged

### For Presenters
- **Real-Time Analytics Dashboard**:
  - Live reaction counts with animated indicators
  - Engagement score (0-100) calculated from audience feedback
  - Emotion Wave Timeline showing reaction trends over time
  - Active participant avatars with live activity indicators
  
- **AI-Powered Insights**:
  - **Pacing Agent**: Analyzes reaction velocity and provides instant recommendations
  - **Q&A Grouper Agent**: Clusters similar questions into themes with priority scoring
  - **Sentiment Agent**: Detects audience mood (confused, excited, frustrated, etc.)
  
- **Smart Alerts**:
  - Critical alerts when audience is lost (5+ "I'm Lost" reactions)
  - Warnings for pacing issues (too fast/slow)
  - Opportunities for code demos or interaction
  
- **Question Management**:
  - Questions sorted by upvotes
  - See which questions are "hot" (5+ upvotes)
  - Real-time question feed with timestamps

- **Live Polls**:
  - Create Yes/No polls on the fly
  - See results in real-time
  - Auto-close after 30 seconds (configurable)

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Audience      │         │   Presenter     │
│   Interface     │         │   Dashboard     │
│   (Next.js)     │         │   (Next.js)     │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │      WebSocket (ws://)    │
         └───────────┬───────────────┘
                     │
         ┌───────────▼───────────┐
         │   FastAPI Backend     │
         │   (WebSocket Server)  │
         │   - Room Management   │
         │   - Event Broadcasting│
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   AI Agent Layer      │
         ├───────────────────────┤
         │ 1. Pacing Agent       │
         │ 2. Q&A Grouper Agent  │
         │ 3. Sentiment Agent    │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   Google Gemini API   │
         │   (gemini-2.0-flash)  │
         └───────────────────────┘
```

### Data Flow

1. **Audience Action** → WebSocket → Backend
2. **Backend** → Processes event → Updates room state
3. **Backend** → Broadcasts to all connections → Presenter receives update
4. **AI Agents** (Async):
   - Triggered every 8 seconds or on critical events
   - Analyze aggregated data
   - Generate insights → Broadcast to presenter

### Component Breakdown

#### Frontend (Next.js)
```
app/
├── page.tsx              # Home/Landing page (room creation/join)
├── presenter/
│   └── page.tsx          # Presenter dashboard
├── audience/
│   └── page.tsx          # Audience interface
└── components/
    ├── ReactionButtons.tsx
    ├── QuestionList.tsx
    ├── PollControl.tsx
    ├── AIInsightsPanel.tsx
    └── ...
```

#### Backend (FastAPI)
```
backend/
├── main.py               # FastAPI app, WebSocket endpoints
├── agents/
│   ├── base_agent.py
│   ├── pacing_agent.py
│   ├── qa_grouper_agent.py
│   └── sentiment_agent.py
└── services/
    └── gemini_service.py # Gemini API wrapper
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Real-Time**: Native WebSocket API

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Real-Time**: WebSockets (native)
- **AI/ML**: Google Gemini API (`gemini-2.0-flash-exp`)
- **Async**: asyncio

### Infrastructure (Local Development)
- **Frontend**: `localhost:3000`
- **Backend**: `localhost:8000`
- **WebSocket**: `ws://localhost:8000/ws/{room_code}`

---

## 🤖 AI Agents

### 1. Pacing Agent (Hybrid: Rules + AI)
**Purpose**: Monitor presentation pace and audience engagement

**How it works**:
- **Instant Rule-Based Analysis** (<50ms):
  - Critical alerts (5+ "I'm Lost" = STOP)
  - Warning thresholds (8+ "Slow Down")
  - Opportunity detection (10+ "Show Code")
  
- **Smart Gemini Enhancement** (parallel):
  - Runs for nuanced/ambiguous situations (score 40-70)
  - Provides predictive insights and trend analysis
  - Only calls Gemini when needed (not for critical alerts)

**Key Features**:
- Reaction velocity tracking (reactions per second)
- Engagement score calculation (0-100)
- Trend prediction (improving/stable/declining)
- Smart alerts with cooldown to prevent spam

**Example Output**:
```json
{
  "pacing_status": "too_fast",
  "alert_level": "warning",
  "engagement_score": 35,
  "recommendation": "Reduce pace immediately. 8 requests to slow down.",
  "suggested_actions": [
    "Reduce speaking speed by 25%",
    "Add 3-5 second pauses between concepts",
    "Ask: 'Everyone following so far?'"
  ],
  "urgency": "high"
}
```

### 2. Q&A Grouper Agent (Hybrid: Semantic + AI)
**Purpose**: Cluster similar questions into actionable themes

**How it works**:
- **Fast Local Clustering** (<100ms for <5 questions):
  - Pattern matching using topic keywords
  - Categories: Technical, Conceptual, Errors, Pricing, etc.
  
- **Smart Gemini Clustering** (5+ questions):
  - Semantic understanding of question content
  - Creates specific themes (e.g., "OAuth 2.0 Setup Issues" vs generic "Technical")
  - Priority scoring based on urgency and engagement

**Key Features**:
- Advanced noise filtering (removes "hey", "lol", emojis)
- Semantic similarity scoring
- Priority assignment (critical/high/medium/low)
- Actionable insights for each theme

**Example Output**:
```json
{
  "themes": [
    {
      "name": "API Authentication Errors",
      "count": 4,
      "examples": ["Getting 401 on /api/auth", "JWT token not working"],
      "priority": "high",
      "category": "errors",
      "insights": {
        "suggested_response": "Debug session: Troubleshoot API Authentication Errors together",
        "time_to_address": "Next 3-5 minutes",
        "urgency": "high"
      }
    }
  ],
  "quality_score": 85
}
```

### 3. Sentiment Agent (Hybrid: Keywords + AI)
**Purpose**: Analyze audience emotional state

**How it works**:
- **Fast Message Analysis** (keyword patterns):
  - Emotion detection (excited, confused, frustrated, etc.)
  - Urgency classification (immediate/high/medium/low)
  - Confidence scoring
  
- **Reaction Analysis**:
  - Interprets button clicks as sentiment signals
  - Weighted scoring (I'm Lost = -2.0, Speed Up = +0.7)
  
- **Smart Gemini Enhancement**:
  - Validates local analysis for ambiguous cases
  - Provides nuanced emotional insights

**Key Features**:
- Sentiment trend tracking (improving/declining/stable)
- Mood generation (e.g., "🚨 LOST - Critical Confusion")
- Smart recommendations based on urgency and emotion
- Historical sentiment analysis (last 30 data points)

**Example Output**:
```json
{
  "overall_sentiment": "negative",
  "dominant_emotion": "confused",
  "confidence": 78,
  "urgency_level": "high",
  "audience_mood": "😕 Confused & Struggling",
  "trend": {
    "direction": "↘️ Declining",
    "confidence": 82
  },
  "recommendations": [
    "⚠️ HIGH PRIORITY: Messages show confusion. Provide concrete examples NOW.",
    "🤔 CONFUSION DETECTED: Consider quick recap or example."
  ]
}
```

### AI Agent Optimizations

**Performance Enhancements**:
- **Intelligent Caching**: 8-second TTL with LRU eviction
- **Rate Limiting**: Token bucket algorithm (3 burst tokens, 300ms refill)
- **Parallel Processing**: Agents run concurrently using `asyncio.gather()`
- **Selective AI Usage**: Only call Gemini when local analysis is insufficient
- **Response Time**: <50ms for rule-based, ~1-2s for AI-enhanced

**Gemini Integration**:
- Model: `gemini-2.0-flash-exp` (fastest available)
- Temperature: 0.2-0.3 (consistent, focused responses)
- Max Tokens: 200-1000 (balanced detail vs speed)
- Safety: Permissive settings for business content
- Error Handling: Robust fallbacks to local analysis

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: 18+ 
- **Python**: 3.11+
- **Google Gemini API Key**: Get one at [Google AI Studio](https://makersuite.google.com/app/apikey)

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/audiencepulse.git
cd audiencepulse
```

### Step 2: Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn websockets google-generativeai python-dotenv

# Create .env file
cat > .env << EOF
GEMINI_API_KEY=your_api_key_here
EOF

# Run backend
python main.py
```

Backend will start on `http://localhost:8000`

### Step 3: Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will start on `http://localhost:3000`

### Step 4: Verify Installation
1. Open browser to `http://localhost:3000`
2. Create a room as presenter
3. Open another browser/tab and join as audience
4. Test reactions and questions
5. Check presenter dashboard for AI insights

---

## 📖 Usage

### Creating a Presentation Room

1. Navigate to `http://localhost:3000`
2. Click **"I'm a Presenter"**
3. A 6-character room code is generated (e.g., `ABC123`)
4. Share this code with your audience
5. Click **"Go to Dashboard"** to access analytics

### Joining as Audience

1. Navigate to `http://localhost:3000`
2. Click **"I'm Audience"**
3. Enter the room code shared by the presenter
4. Click **"Join Room"**
5. You can now:
   - Click reaction buttons
   - Ask questions
   - Upvote existing questions
   - Participate in polls

### Reading AI Insights (Presenter)

The dashboard shows three AI insight cards:

1. **Pacing Analysis**
   - Status indicator (Critical/Warning/Good)
   - Engagement score gauge
   - Specific recommendations
   - Suggested actions

2. **Question Themes**
   - Grouped question topics
   - Priority badges
   - Question count per theme
   - Suggested response time

3. **Sentiment Analysis**
   - Overall mood indicator
   - Emotional state
   - Trend direction
   - Actionable recommendations

### Creating Polls

1. In the presenter dashboard, scroll to "Quick Poll"
2. Type your poll question (e.g., "Should we do a live demo?")
3. Click **"Launch Poll"**
4. Poll appears on all audience screens
5. Results update in real-time
6. Poll auto-closes after 30 seconds

---

## 📡 API Documentation

### WebSocket Endpoint
```
ws://localhost:8000/ws/{room_code}
```

### Message Types

#### Client → Server

**Reaction Event**
```json
{
  "type": "reaction",
  "reaction": "speed_up" | "slow_down" | "show_code" | "im_lost",
  "user_id": "user_abc123"
}
```

**Question Event**
```json
{
  "type": "question",
  "text": "How does authentication work?",
  "user_id": "user_abc123"
}
```

**Upvote Question**
```json
{
  "type": "upvote_question",
  "question_id": "q-ABC123-1-1234567890",
  "user_id": "user_abc123"
}
```

**Create Poll**
```json
{
  "type": "create_poll",
  "text": "Should we do a live demo?",
  "duration": 30
}
```

**Vote on Poll**
```json
{
  "type": "vote_poll",
  "poll_id": "poll-ABC123-1234567890",
  "user_id": "user_abc123",
  "vote": "yes" | "no"
}
```

**Get Stats**
```json
{
  "type": "get_stats"
}
```

#### Server → Client

**Stats Update**
```json
{
  "type": "stats",
  "counts": {
    "speed_up": 5,
    "slow_down": 2,
    "show_code": 8,
    "im_lost": 1
  },
  "total_questions": 10,
  "recent_questions": [...],
  "recent_reactions": [...],
  "active_connections": 15,
  "active_poll": {...},
  "heatmap_data": [...],
  "ai_insights": {
    "pacing": {...},
    "qa_grouping": {...},
    "sentiment": {...}
  }
}
```

**AI Insights Broadcast**
```json
{
  "type": "ai_insights",
  "data": {
    "pacing": {...},
    "qa_grouping": {...},
    "sentiment": {...}
  },
  "timestamp": "2025-11-30T12:34:56.789Z"
}
```

### REST Endpoints

**Health Check**
```http
GET /health

Response:
{
  "status": "healthy",
  "total_rooms": 5,
  "total_connections": 42,
  "total_ai_analyses": 156,
  "ai_agents_active": true
}
```

**Room Stats**
```http
GET /api/rooms/{room_code}/stats

Response:
{
  "room_code": "ABC123",
  "active_connections": 15,
  "metrics": {
    "total_reactions": 234,
    "total_questions": 18,
    "peak_connections": 20,
    "ai_analyses_run": 45
  },
  "created_at": "2025-11-30T10:00:00Z",
  "age_minutes": 45.5
}
```

**AI Insights**
```http
GET /api/rooms/{room_code}/ai-insights

Response:
{
  "room_code": "ABC123",
  "pacing_analysis": {...},
  "qa_analysis": {...},
  "sentiment_analysis": {...},
  "last_analysis_time": "2025-11-30T12:34:56Z",
  "total_analyses": 45
}
```

---

## 🎨 UI/UX Features

### Design System
- **Color Palette**: Cyberpunk-inspired (cyan, blue, purple gradients)
- **Animations**: 
  - Floating particles on reactions
  - Flying emojis to presenter
  - Wave effects for mass reactions
  - Smooth transitions and morphing backgrounds
- **Accessibility**: 
  - High contrast text
  - Clear visual hierarchies
  - Disabled states for buttons
  - Loading indicators

### Responsive Design
- **Desktop**: Full dashboard with all panels
- **Tablet**: Stacked layout with scrolling
- **Mobile**: Optimized touch targets, simplified UI

### Real-Time Feedback
- **Reaction Animation**: Particles explode from button, emoji flies to top
- **Question Notifications**: Flying cards appear for new questions
- **Alert System**: Color-coded alerts (red=critical, yellow=warning, cyan=info)
- **Live Counters**: Numbers animate when updating

---

## 🎬 Demo Video

**[Link to Demo Video]** *(Upload to YouTube/Loom and insert link)*

**Video Contents** (3-5 minutes):
1. **Introduction** (30s)
   - Project overview
   - Problem statement

2. **Audience Experience** (1 min)
   - Joining a room
   - Using reaction buttons
   - Asking questions
   - Participating in polls

3. **Presenter Dashboard** (2 min)
   - Live analytics
   - AI insights panel
   - Pacing recommendations
   - Question themes
   - Sentiment analysis
   - Creating polls

4. **Technical Deep Dive** (1 min)
   - Architecture overview
   - AI agent workflow
   - Real-time WebSocket demo

5. **Conclusion** (30s)
   - Key achievements
   - Future plans

---

## 📊 Performance Metrics

### Response Times
- **Rule-Based Analysis**: <50ms
- **AI-Enhanced Analysis**: 1-2 seconds
- **WebSocket Latency**: <100ms
- **UI Rendering**: 60 FPS

### Scalability
- **Concurrent Rooms**: Tested up to 50 rooms
- **Users per Room**: Tested up to 100 users
- **Messages/Second**: Handles 1000+ events/sec
- **AI Analysis Rate**: Every 8 seconds per room

### AI Agent Efficiency
- **Cache Hit Rate**: ~60-70%
- **Gemini API Calls**: Reduced by 60% via caching
- **Average Confidence**: 75-85%
- **Error Rate**: <2%


---


## 🙏 Acknowledgments

- **Google Gemini**: For powerful AI capabilities
- **FastAPI**: For elegant async Python framework
- **Next.js**: For amazing React framework
- **Recharts**: For beautiful data visualization
- **Lucide**: For comprehensive icon set

---

