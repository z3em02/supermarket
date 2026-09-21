@echo off
echo Starting B2B Supermarket Application...

echo Starting backend server...
cd backend
start cmd /k "npm start"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting frontend server...
cd ..\frontend
start cmd /k "npm run dev"

echo Backend running on http://localhost:5000
echo Frontend running on http://localhost:5173
echo.
echo Default credentials: admin@supermarket.com / admin123
echo.
pause