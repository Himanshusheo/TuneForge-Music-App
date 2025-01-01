# TuneForge – Full-Stack Music Streaming & Admin Platform

A comprehensive music streaming platform built with Node.js, Express, and MongoDB featuring role-based access, playlist management, and admin controls.

## Features

- 🎵 **Music Streaming**: High-quality audio playback with dynamic interface
- 👥 **User Authentication**: Secure login/registration with session management
- 📝 **Playlist Management**: Create, edit, and share custom playlists
- 🔍 **Advanced Search**: Filter songs by genre, artist, album, and more
- 📖 **Lyrics Display**: Real-time lyrics synchronization
- 🏆 **Badge Rewards**: Achievement system for user engagement
- 💎 **Subscription Tiers**: Premium features with middleware-based access control
- 👨‍💼 **Admin Panel**: Complete song upload and user management system
- 🎨 **Responsive Design**: Modern UI with EJS templates

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: EJS templates, HTML5, CSS3, JavaScript
- **File Upload**: Multer for song and image handling
- **Authentication**: Express-session with bcryptjs
- **Security**: Helmet, CORS, Rate limiting

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/tuneforge.git
cd tuneforge
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

Create a `.env` file with the following variables:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tuneforge
SESSION_SECRET=your-session-secret-key
NODE_ENV=development
```

## Project Structure

```
tuneforge/
├── controllers/          # Route controllers
├── models/              # MongoDB schemas
├── routes/              # Express routes
├── middleware/          # Custom middleware
├── public/              # Static assets
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   ├── images/         # Images and icons
│   └── uploads/        # Uploaded files
├── views/              # EJS templates
├── config/             # Configuration files
└── server.js           # Main application file
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Songs
- `GET /songs` - Get all songs with filters
- `GET /songs/:id` - Get song details
- `POST /songs/upload` - Upload new song (Admin only)

### Playlists
- `GET /playlists` - Get user playlists
- `POST /playlists` - Create new playlist
- `PUT /playlists/:id` - Update playlist
- `DELETE /playlists/:id` - Delete playlist

### Admin
- `GET /admin` - Admin dashboard
- `POST /admin/songs` - Upload songs
- `GET /admin/users` - Manage users

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request


## Timeline

**Jan'25 - Feb'25**: Full-stack development with focus on user experience and admin functionality


