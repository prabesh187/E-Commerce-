@echo off
echo ========================================
echo COMPLETE RESTART - Made in Nepal
echo ========================================
echo.
echo This will:
echo 1. Check MongoDB
echo 2. Seed the database
echo 3. Start backend server
echo 4. Start frontend server
echo.
pause

echo.
echo [1/4] Checking MongoDB...
mongod --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] MongoDB not found!
    echo Please install MongoDB first.
    pause
    exit /b 1
)
echo [OK] MongoDB is installed
echo.

echo [2/4] Starting MongoDB service...
net start MongoDB >nul 2>&1
if errorlevel 1 (
    echo [INFO] MongoDB already running or using Atlas
) else (
    echo [OK] MongoDB service started
)
echo.

echo [3/4] Seeding database with products...
cd backend
call npm run seed
if errorlevel 1 (
    echo [ERROR] Database seeding failed!
    echo Make sure MongoDB is running.
    pause
    exit /b 1
)
cd ..
echo.

echo [4/4] Starting servers...
echo.
echo Opening backend server in new window...
start "Backend Server - DO NOT CLOSE" cmd /k "cd backend && npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Opening frontend server in new window...
start "Frontend Server - DO NOT CLOSE" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo SETUP COMPLETE!
echo ========================================
echo.
echo Two terminal windows have opened:
echo 1. Backend Server (port 5000)
echo 2. Frontend Server (port 5173)
echo.
echo DO NOT CLOSE THOSE WINDOWS!
echo.
echo Wait 10 seconds, then open your browser to:
echo http://localhost:5173
echo.
echo Login credentials:
echo   Admin:  admin@madeinnepal.com  / Admin@123
echo   Seller: seller@madeinnepal.com / Seller@123
echo   Buyer:  buyer@madeinnepal.com  / Buyer@123
echo.
echo Press Ctrl+Shift+R in browser to hard refresh!
echo.
pause
