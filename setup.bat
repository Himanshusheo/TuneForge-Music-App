@echo off
echo 🎵 TuneForge Setup Script
echo ========================
echo.

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Dependencies installed successfully!

echo.
echo 🗄️  Setting up environment...
if not exist .env (
    copy env.example .env
    echo ✅ Created .env file
) else (
    echo ✅ .env file already exists
)

echo.
echo 📁 Creating upload directories...
if not exist "public\uploads\songs" mkdir "public\uploads\songs"
if not exist "public\uploads\covers" mkdir "public\uploads\covers"
if not exist "public\uploads\avatars" mkdir "public\uploads\avatars"
if not exist "public\uploads\playlists" mkdir "public\uploads\playlists"
echo ✅ Upload directories created

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Next steps:
echo    1. Make sure MongoDB is running
echo    2. Update .env file if needed
echo    3. Run: npm run dev
echo    4. Open: http://localhost:3000
echo.
pause


