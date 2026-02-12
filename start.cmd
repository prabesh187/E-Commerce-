@echo off
echo ========================================
echo Made in Nepal E-Commerce Platform
echo ========================================
echo.

echo Checking MongoDB...
mongod --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] MongoDB not found or not in PATH
    echo Please install MongoDB or use MongoDB Atlas
    echo.
    pause
    exit /b 1
)

echo [OK] MongoDB is installed
echo.

echo Starting MongoDB service...
net start MongoDB >nul 2>&1
if errorlevel 1 (
    echo [INFO] MongoDB service already running or using Atlas
) else (
    echo [OK] MongoDB service started
)
echo.

echo ========================================
echo Database Setup
echo ========================================
echo Do you want to seed the database with sample data?
echo (This will clear existing data and add sample products)
echo.
set /p SEED_DB="Seed database? (y/n): "

if /i "%SEED_DB%"=="y" (
    echo.
    echo Seeding database...
    cd backend
    call npm run seed
    cd ..
    echo.
    echo [OK] Database seeded successfully
    echo.
    echo Test Accounts:
    echo   Admin:  admin@madeinnepal.com  / Admin@123
    echo   Seller: seller@madeinnepal.com / Seller@123
    echo   Buyer:  buyer@madeinnepal.com  / Buyer@123
    echo.
    timeout /t 3 /nobreak >nul
)

echo.
echo ========================================
echo Starting Backend Server...
echo ========================================
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Starting Frontend Server...
echo ========================================
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Servers are starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Two terminal windows will open.
echo Wait for both servers to start, then open:
echo http://localhost:5173 in your browser
echo.
echo Press any key to exit this window...
pause >nul
