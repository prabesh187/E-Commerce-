@echo off
echo ========================================
echo   MADE IN NEPAL - FRESH START
echo ========================================
echo.
echo This will start your application fresh!
echo.
echo Step 1: Checking MongoDB...
mongod --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] MongoDB is not installed or not in PATH
    echo Please install MongoDB first!
    pause
    exit /b 1
)
echo [OK] MongoDB is installed
echo.

echo Step 2: Starting MongoDB service...
net start MongoDB >nul 2>&1
if errorlevel 1 (
    echo [INFO] MongoDB service already running or needs admin rights
) else (
    echo [OK] MongoDB service started
)
echo.

echo Step 3: Seeding database with sample data...
cd backend
call npm run seed
if errorlevel 1 (
    echo [ERROR] Database seeding failed!
    pause
    exit /b 1
)
cd ..
echo.

echo Step 4: Starting Backend Server...
start "Made in Nepal - Backend" cmd /k "cd backend && npm run dev"
echo [OK] Backend server starting in new window...
echo.

echo Step 5: Waiting for backend to start (10 seconds)...
timeout /t 10 /nobreak >nul
echo.

echo Step 6: Starting Frontend Server...
start "Made in Nepal - Frontend" cmd /k "cd frontend && npm run dev"
echo [OK] Frontend server starting in new window...
echo.

echo ========================================
echo   SERVERS ARE STARTING!
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo WAIT 30 SECONDS for both servers to fully start!
echo.
echo Then open your browser to: http://localhost:5173
echo.
echo TEST ACCOUNTS:
echo   Admin:  admin@madeinnepal.com  / Admin@123
echo   Seller: seller@madeinnepal.com / Seller@123
echo   Buyer:  buyer@madeinnepal.com  / Buyer@123
echo.
echo Press Ctrl+C in the server windows to stop them.
echo.
pause
