# 🌊 ZenFlow: Autonomous Presence Tracker

ZenFlow is a premium, cyberpunk-inspired desk presence monitoring system. It uses computer vision to track when you are at your desk and automatically logs "away" sessions (partial logs) to help you monitor your study or work efficiency.

![ZenFlow Dashboard](https://raw.githubusercontent.com/Yash-007688/zenflow/main/preview.png)

## ✨ Key Features

- **🛡️ Stable Presence Detection**: Uses high-performance Haar Cascades (via OpenCV) for real-time face tracking with zero lag.
- **🕒 Permanent Session Management**: Automated "Log On" when the program starts and manual "Log Off" for full-day tracking.
- **📊 Real-time Dashboard**: A stunning React-based interface featuring glassmorphism, neon accents, and live status updates.
- **🗄️ Persistent Logging**: Automatically saves all sessions to a local SQLite database (`presence_logs.db`).
- **🔌 Socket-Powered**: Instant state synchronization between the Python backend and the React frontend.

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js & npm
- A functional webcam

### 1. Backend Setup (Presence Detection)

```bash
cd backend
pip install -r requirements.txt
python server.py
```
*The server will start on `http://localhost:5000`.*

### 2. Frontend Setup (Dashboard)

```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` to view your dashboard.*

## 🛠️ Tech Stack

- **Backend**: Python, OpenCV, Flask-SocketIO, SQLite.
- **Frontend**: React, TypeScript, Vite, TailwindCSS, Framer Motion, Lucide-React.
- **Protocol**: WebSockets (Socket.IO).

## 📊 Database Schema

The system logs two types of data:
1. **Permanent Sessions**: Daily punch-on/off records.
2. **Partial Logs**: Detected "away" breaks during a session.

---
Created with 💙 for high-performance learners.
