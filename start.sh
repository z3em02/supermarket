#!/bin/bash

echo "Starting B2B Supermarket Application..."

# Start backend
echo "Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend running on http://localhost:5000"
echo "Frontend running on http://localhost:5173"
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID