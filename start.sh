#!/usr/bin/env bash

# ==============================================================================
# TradePulse EXIM - Unified Development Launcher with Hot Reload / Auto-Refresh
# Runs Flask Backend (Port 5001) + Next.js Frontend (Port 3000) concurrently.
# ==============================================================================

# Ensure script runs from project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Terminal Color Definitions
C_RESET="\033[0m"
C_BOLD="\033[1m"
C_EMERALD="\033[38;5;48m"
C_CYAN="\033[38;5;45m"
C_AMBER="\033[38;5;214m"
C_RED="\033[38;5;196m"
C_GRAY="\033[38;5;242m"

echo -e "\n${C_BOLD}${C_EMERALD}=================================================================${C_RESET}"
echo -e "${C_BOLD}${C_EMERALD}    TradePulse EXIM 🌾 - Unified Development Environment        ${C_RESET}"
echo -e "${C_GRAY}    Next.js 14 (Fast Refresh) + Flask 3.1 (Werkzeug Auto-Reload) ${C_RESET}"
echo -e "${C_BOLD}${C_EMERALD}=================================================================${C_RESET}\n"

# ------------------------------------------------------------------------------
# 1. Pre-Flight Verification
# ------------------------------------------------------------------------------

# Check MongoDB
if lsof -i :27017 > /dev/null 2>&1; then
    echo -e "${C_EMERALD}✔ MongoDB active on port 27017${C_RESET}"
else
    echo -e "${C_AMBER}⚠ Warning: MongoDB not detected on port 27017.${C_RESET}"
    echo -e "  Attempting to start MongoDB via brew if available..."
    brew services start mongodb-community > /dev/null 2>&1 || true
    sleep 1
    if lsof -i :27017 > /dev/null 2>&1; then
        echo -e "${C_EMERALD}✔ MongoDB started successfully on port 27017${C_RESET}"
    else
        echo -e "${C_RED}✖ Could not connect to MongoDB. Please ensure mongod is running.${C_RESET}"
    fi
fi

# Check Python Virtual Environment
if [ -f "./venv/bin/python3" ]; then
    PYTHON_EXEC="$(pwd)/venv/bin/python3"
    echo -e "${C_EMERALD}✔ Python venv verified (${PYTHON_EXEC})${C_RESET}"
else
    echo -e "${C_RED}✖ Virtual environment not found at ./venv.${C_RESET}"
    echo -e "  Creating virtual environment and installing requirements..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install -r backend/requirements.txt
    PYTHON_EXEC="$(pwd)/venv/bin/python3"
fi

# Check Node / npm and Frontend Dependencies
if ! command -v npm &> /dev/null; then
    echo -e "${C_RED}✖ Node.js / npm is required but not installed.${C_RESET}"
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${C_AMBER}⚙ Installing frontend node_modules...${C_RESET}"
    (cd frontend && npm install)
    echo -e "${C_EMERALD}✔ Frontend dependencies installed${C_RESET}"
else
    echo -e "${C_EMERALD}✔ Frontend node_modules verified${C_RESET}"
fi

# ------------------------------------------------------------------------------
# 2. Free up lingering processes on 5001 and 3000
# ------------------------------------------------------------------------------
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${C_GRAY}Stopping lingering process on port ${port} (PID: ${pids})...${C_RESET}"
        kill -9 $pids 2>/dev/null || true
    fi
}

kill_port 5001
kill_port 3000

# ------------------------------------------------------------------------------
# 3. Graceful Process Cleanup Trap
# ------------------------------------------------------------------------------
BACKEND_PID=0
FRONTEND_PID=0

cleanup() {
    echo -e "\n\n${C_AMBER}Shutting down TradePulse EXIM servers...${C_RESET}"
    
    if [ $BACKEND_PID -ne 0 ]; then
        kill -TERM $BACKEND_PID 2>/dev/null || true
    fi
    if [ $FRONTEND_PID -ne 0 ]; then
        kill -TERM $FRONTEND_PID 2>/dev/null || true
    fi

    # Ensure ports are clean
    sleep 1
    kill_port 5001
    kill_port 3000
    
    echo -e "${C_EMERALD}✔ All services stopped cleanly. Goodbye!${C_RESET}\n"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# 4. Start Flask Backend with Werkzeug Auto-Reload (Port 5001)
# ------------------------------------------------------------------------------
echo -e "\n${C_CYAN}▶ Launching Flask Backend on http://localhost:5001 (Auto-Reloading)...${C_RESET}"
(cd backend && $PYTHON_EXEC run.py --port 5001 --debug) &
BACKEND_PID=$!

# Wait briefly for Flask to bind
sleep 2

# Verify Backend is responsive
if curl -s http://127.0.0.1:5001/api/dashboard/stats > /dev/null 2>&1; then
    echo -e "${C_EMERALD}✔ Backend REST API ready at http://localhost:5001/api${C_RESET}"
else
    echo -e "${C_AMBER}ℹ Backend initializing in background (PID: $BACKEND_PID)...${C_RESET}"
fi

# ------------------------------------------------------------------------------
# 5. Start Next.js Frontend with React Fast Refresh / Hot Reload (Port 3000)
# ------------------------------------------------------------------------------
echo -e "${C_CYAN}▶ Launching Next.js 14 Frontend on http://localhost:3000 (Fast Refresh)...${C_RESET}"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Wait briefly for Next.js to compile initial bundle
sleep 3

# ------------------------------------------------------------------------------
# 6. Service Dashboard Banner
# ------------------------------------------------------------------------------
echo -e "\n${C_BOLD}${C_EMERALD}=================================================================${C_RESET}"
echo -e "${C_BOLD}🚀 TradePulse EXIM is Live & Auto-Reloading!${C_RESET}"
echo -e "${C_BOLD}${C_EMERALD}=================================================================${C_RESET}"
echo -e "  ${C_BOLD}• Main Dashboard:${C_RESET}       ${C_CYAN}http://localhost:3000${C_RESET}"
echo -e "  ${C_BOLD}• Lead Engine:${C_RESET}          ${C_CYAN}http://localhost:3000/leads${C_RESET}"
echo -e "  ${C_BOLD}• Trade Funnel (CRM):${C_RESET}   ${C_CYAN}http://localhost:3000/pipeline${C_RESET}"
echo -e "  ${C_BOLD}• Campaigns:${C_RESET}            ${C_CYAN}http://localhost:3000/campaigns${C_RESET}"
echo -e "  ${C_BOLD}• Market Intelligence:${C_RESET}  ${C_CYAN}http://localhost:3000/intelligence${C_RESET}"
echo -e "  ${C_BOLD}• Cargo & Parcel:${C_RESET}       ${C_CYAN}http://localhost:3000/cargo${C_RESET}"
echo -e "  ${C_BOLD}• Public Tracking:${C_RESET}      ${C_CYAN}http://localhost:3000/track${C_RESET}"
echo -e "  ${C_BOLD}• System Preferences:${C_RESET}   ${C_CYAN}http://localhost:3000/settings${C_RESET}"
echo -e "  ${C_BOLD}• Flask REST API:${C_RESET}       ${C_GRAY}http://localhost:5001/api${C_RESET}"
echo -e "  ${C_BOLD}• MongoDB Database:${C_RESET}     ${C_GRAY}mongodb://localhost:27017/trade_suite${C_RESET}"
echo -e "${C_BOLD}${C_EMERALD}=================================================================${C_RESET}"
echo -e "${C_GRAY}🔥 Hot Reload Active: Editing .tsx/.ts files in frontend/ or .py files in app/ refreshes automatically.${C_RESET}"
echo -e "${C_AMBER}Press [Ctrl+C] at any time to gracefully terminate both services.${C_RESET}\n"

# Keep the script running to stream logs from both servers until Ctrl+C
wait

