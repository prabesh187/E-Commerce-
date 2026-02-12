@echo off
echo ========================================
echo   KILLING ALL OLD PROCESSES
echo ========================================
echo.

echo Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if errorlevel 1 (
    echo [INFO] No Node.js processes found
) else (
    echo [OK] Killed all Node.js processes
)

echo Killing all npm processes...
taskkill /F /IM npm.cmd >nul 2>&1

echo Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   STARTING FRESH SERVERS
echo ========================================
echo.

echo Starting Backend Server...
start "Made in Nepal - Backend" cmd /k "cd backend && npm run dev"
echo [OK] Backend starting...

echo Waiting 10 seconds for backend...
timeout /t 10 /nobreak >nul

echo Starting Frontend Server...
start "Made in Nepal - Frontend" cmd /k "cd frontend && npm run dev"
echo [OK] Frontend starting...

echo.
echo ========================================
echo   SERVERS STARTED!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo WAIT 20 SECONDS, then:
echo.
echo 1. Close your browser COMPLETELY
echo 2. Open NEW browser window
echo 3. Go to: http://localhost:5173
echo 4. Press Ctrl+Shift+R (hard refresh)
echo 5. Login with: admin@madeinnepal.com / Admin@123
echo.
echo If you still see port 5174, that means port 5173 is STILL in use!
echo You need to close ALL browser tabs and terminals first!
echo.
pause
