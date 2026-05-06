#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo "Starting Gondar Fuel Tracker Server..."
echo ""

# Check if port 3000 is in use and kill the process
PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$PORT_PID" ]; then
    echo "Port 3000 is in use (PID: $PORT_PID). Stopping existing process..."
    kill -9 $PORT_PID 2>/dev/null
    sleep 1
fi

node server.js
echo ""
echo "Server stopped."
