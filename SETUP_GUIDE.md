# 🎵 TuneForge - Local Setup Guide

## Prerequisites

### 1. Install Node.js and npm
- Download from: https://nodejs.org/
- Choose the LTS version (recommended)
- Run the installer with default settings
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 2. Install MongoDB

#### Option A: MongoDB Community Server (Local)
1. Download from: https://www.mongodb.com/try/download/community
2. Install with default settings
3. Start MongoDB service:
   ```bash
   # Windows (as Administrator)
   net start MongoDB
   
   # Or start manually
   mongod
   ```

#### Option B: MongoDB Atlas (Cloud - Recommended for beginners)
1. Go to: https://www.mongodb.com/atlas
2. Create a free account
3. Create a free cluster (M0 Sandbox)
4. Get your connection string
5. Update `.env` file with your connection string

## Quick Setup (Windows)

### Method 1: Using Batch Files (Easiest)
1. Double-click `setup.bat` to install dependencies
2. Double-click `start.bat` to start the server

### Method 2: Manual Setup
1. Open PowerShell in the project directory
2. Run the following commands:

```bash
# Install dependencies
npm install

# Create .env file (if it doesn't exist)
copy env.example .env

# Start the development server
npm run dev
```

## Configuration

### 1. Environment Variables (.env file)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tuneforge
SESSION_SECRET=your-super-secret-session-key-here
NODE_ENV=development
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=50000000
```

### 2. MongoDB Connection
- **Local MongoDB**: Use `mongodb://localhost:27017/tuneforge`
- **MongoDB Atlas**: Use your connection string from Atlas

## Running the Application

### Development Mode
```bash
npm run dev
```
- Server runs on: http://localhost:3000
- Auto-restarts on file changes
- Detailed error messages

### Production Mode
```bash
npm start
```

## Accessing the Application

### Main Features
- **Homepage**: http://localhost:3000
- **Login**: http://localhost:3000/auth/login
- **Register**: http://localhost:3000/auth/register
- **Songs**: http://localhost:3000/songs
- **Playlists**: http://localhost:3000/playlists

### Admin Panel
1. Register a new account
2. Manually set user role to 'admin' in MongoDB:
   ```javascript
   // In MongoDB shell or Compass
   db.users.updateOne(
     { email: "your-email@example.com" },
     { $set: { role: "admin" } }
   )
   ```
3. Access admin panel: http://localhost:3000/admin

## Testing the Application

### 1. Create an Account
- Go to http://localhost:3000/auth/register
- Fill out the registration form
- Verify account creation

### 2. Upload Songs (Admin)
- Login as admin
- Go to http://localhost:3000/admin/songs/upload
- Upload audio files (MP3, WAV, etc.)
- Add metadata (title, artist, genre, etc.)

### 3. Create Playlists
- Go to http://localhost:3000/playlists/create
- Create a new playlist
- Add songs to the playlist

### 4. Test Music Streaming
- Browse songs at http://localhost:3000/songs
- Click play buttons to test audio streaming
- Test playlist playback

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors
```bash
# Delete node_modules and reinstall
rmdir /s node_modules
npm install
```

#### 2. MongoDB connection errors
- Check if MongoDB is running
- Verify connection string in .env
- Check firewall settings

#### 3. Port already in use
```bash
# Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

#### 4. File upload issues
- Check upload directory permissions
- Verify file size limits
- Ensure supported file formats

### Getting Help
- Check console logs for error messages
- Verify all dependencies are installed
- Ensure MongoDB is running
- Check .env file configuration

## Development Tips

### 1. File Structure
```
TuneForge/
├── models/          # Database schemas
├── routes/          # API endpoints
├── views/           # EJS templates
├── public/          # Static files
├── middleware/      # Custom middleware
└── server.js        # Main application
```

### 2. Adding New Features
- Models: Add to `models/` directory
- Routes: Add to `routes/` directory
- Views: Add to `views/` directory
- Static files: Add to `public/` directory

### 3. Database Management
- Use MongoDB Compass for GUI
- Use MongoDB shell for commands
- Backup data regularly

## Production Deployment

### 1. Environment Setup
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
SESSION_SECRET=strong-production-secret
```

### 2. Security Considerations
- Use strong session secrets
- Enable HTTPS
- Set up proper CORS
- Use environment variables for secrets
- Regular security updates

### 3. Performance Optimization
- Enable gzip compression
- Use CDN for static files
- Optimize database queries
- Implement caching

## Support

If you encounter any issues:
1. Check this guide first
2. Look at console error messages
3. Verify all prerequisites are installed
4. Check MongoDB connection
5. Review .env file configuration

Happy coding with TuneForge! 🎵


