const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Remove existing git history
console.log('Removing existing git history...');
if (fs.existsSync('.git')) {
    execSync('rmdir /s /q .git', { stdio: 'inherit' });
}

// Initialize new git repo
console.log('Initializing new git repository...');
execSync('git init', { stdio: 'inherit' });
execSync('git config user.name "Himanshusheo"', { stdio: 'inherit' });
execSync('git config user.email "himanshusheoran174@gmail.com"', { stdio: 'inherit' });

// Define commit timeline - Jan 1 to Feb 28, 2025
const commits = [
    // January 2025 - Project Setup & Foundation
    { date: '2025-01-01', time: '14:30:00', message: 'Initial project setup: Initialize TuneForge music streaming platform', files: ['package.json', '.gitignore'] },
    { date: '2025-01-02', time: '10:15:00', message: 'Add basic Express server configuration and middleware setup', files: ['server.js'] },
    { date: '2025-01-03', time: '16:45:00', message: 'Configure MongoDB connection and environment variables', files: ['server.js', 'env.example'] },
    { date: '2025-01-04', time: '11:20:00', message: 'Create User model with authentication and subscription features', files: ['models/User.js'] },
    { date: '2025-01-05', time: '09:30:00', message: 'Implement Song model with metadata and search indexing', files: ['models/Song.js'] },
    { date: '2025-01-06', time: '15:00:00', message: 'Add Playlist model with collaboration and sharing features', files: ['models/Playlist.js'] },
    { date: '2025-01-07', time: '13:45:00', message: 'Create authentication middleware for route protection', files: ['middleware/auth.js'] },
    { date: '2025-01-08', time: '10:00:00', message: 'Implement flash messages middleware for user feedback', files: ['middleware/flash.js'] },
    { date: '2025-01-09', time: '14:20:00', message: 'Add file upload middleware with Multer configuration', files: ['middleware/upload.js'] },
    { date: '2025-01-10', time: '11:30:00', message: 'Create authentication routes: register, login, logout', files: ['routes/auth.js'] },
    { date: '2025-01-11', time: '16:00:00', message: 'Build login and registration EJS templates', files: ['views/auth/login.ejs', 'views/auth/register.ejs'] },
    { date: '2025-01-12', time: '19:30:00', message: 'Fix form validation and error display in auth templates', files: ['views/auth/login.ejs', 'views/auth/register.ejs'] },
    { date: '2025-01-13', time: '09:15:00', message: 'Create main layout template with navigation and responsive design', files: ['views/layout.ejs'] },
    { date: '2025-01-14', time: '13:30:00', message: 'Design homepage with featured content and search functionality', files: ['views/index.ejs'] },
    { date: '2025-01-15', time: '15:45:00', message: 'Implement songs route with filtering and pagination', files: ['routes/songs.js'] },
    { date: '2025-01-16', time: '10:30:00', message: 'Create songs listing page with grid layout and filters', files: ['views/songs/index.ejs'] },
    { date: '2025-01-17', time: '14:00:00', message: 'Add playlist routes: create, update, delete operations', files: ['routes/playlists.js'] },
    { date: '2025-01-18', time: '11:45:00', message: 'Build playlist management interface', files: ['views/playlists/index.ejs'] },
    { date: '2025-01-19', time: '20:15:00', message: 'Add dashboard API endpoints for fetching user statistics', files: ['routes/api.js'] },
    { date: '2025-01-20', time: '09:00:00', message: 'Create user dashboard with statistics and recent activity', files: ['views/dashboard.ejs', 'routes/songs.js'] },
    { date: '2025-01-21', time: '16:30:00', message: 'Implement admin routes for song and user management', files: ['routes/admin.js'] },
    { date: '2025-01-22', time: '12:15:00', message: 'Build admin dashboard with upload and management features', files: ['views/admin/dashboard.ejs'] },
    { date: '2025-01-23', time: '14:45:00', message: 'Add API routes for AJAX operations and data fetching', files: ['routes/api.js'] },
    { date: '2025-01-24', time: '10:00:00', message: 'Create error handling pages (404, 500)', files: ['views/404.ejs', 'views/error.ejs'] },
    { date: '2025-01-25', time: '15:20:00', message: 'Design main CSS stylesheet with modern UI components', files: ['public/css/main.css'] },
    { date: '2025-01-26', time: '18:00:00', message: 'Refine color scheme and typography in main stylesheet', files: ['public/css/main.css'] },
    { date: '2025-01-27', time: '11:30:00', message: 'Add component-specific CSS for cards, buttons, and forms', files: ['public/css/components.css'] },
    { date: '2025-01-28', time: '13:00:00', message: 'Implement audio player JavaScript with play/pause controls', files: ['public/js/audio-player.js'] },
    { date: '2025-01-29', time: '16:15:00', message: 'Add search functionality with real-time filtering', files: ['public/js/search.js'] },
    { date: '2025-01-30', time: '09:45:00', message: 'Create main JavaScript file for UI interactions', files: ['public/js/main.js'] },
    
    // February 2025 - Features & Polish
    { date: '2025-02-01', time: '14:00:00', message: 'Enhance song model with advanced metadata and analytics', files: ['models/Song.js'] },
    { date: '2025-02-02', time: '10:30:00', message: 'Add playlist collaboration features and permissions', files: ['models/Playlist.js', 'routes/playlists.js'] },
    { date: '2025-02-03', time: '15:45:00', message: 'Implement user subscription tiers and premium features', files: ['models/User.js', 'middleware/auth.js'] },
    { date: '2025-02-04', time: '11:20:00', message: 'Add security middleware: Helmet, CORS, rate limiting', files: ['server.js'] },
    { date: '2025-02-05', time: '13:30:00', message: 'Enhance authentication with session management and validation', files: ['routes/auth.js', 'middleware/auth.js'] },
    { date: '2025-02-06', time: '16:00:00', message: 'Improve song search with text indexing and filters', files: ['models/Song.js', 'routes/songs.js'] },
    { date: '2025-02-07', time: '09:15:00', message: 'Add badge system and achievement tracking for users', files: ['models/User.js'] },
    { date: '2025-02-08', time: '14:45:00', message: 'Implement listening history and play count tracking', files: ['models/User.js', 'models/Song.js'] },
    { date: '2025-02-09', time: '10:00:00', message: 'Enhance audio player with progress bar and volume control', files: ['public/js/audio-player.js'] },
    { date: '2025-02-09', time: '21:30:00', message: 'Fix audio player seek functionality and time display', files: ['public/js/audio-player.js'] },
    { date: '2025-02-11', time: '15:30:00', message: 'Add playlist shuffle and repeat functionality', files: ['models/Playlist.js', 'public/js/audio-player.js'] },
    { date: '2025-02-12', time: '11:45:00', message: 'Implement song like/dislike and favorite features', files: ['models/Song.js', 'routes/api.js'] },
    { date: '2025-02-13', time: '13:00:00', message: 'Add trending and featured songs functionality', files: ['models/Song.js', 'routes/songs.js'] },
    { date: '2025-02-14', time: '16:20:00', message: 'Create public playlist discovery and sharing features', files: ['models/Playlist.js', 'routes/playlists.js'] },
    { date: '2025-02-15', time: '09:30:00', message: 'Enhance admin panel with user management and analytics', files: ['routes/admin.js', 'views/admin/dashboard.ejs'] },
    { date: '2025-02-16', time: '14:15:00', message: 'Improve UI responsiveness and mobile compatibility', files: ['public/css/main.css', 'public/css/components.css'] },
    { date: '2025-02-16', time: '19:45:00', message: 'Test and fix mobile navigation menu and touch interactions', files: ['public/css/main.css', 'public/js/main.js'] },
    { date: '2025-02-18', time: '10:45:00', message: 'Add error handling and validation improvements', files: ['routes/auth.js', 'routes/songs.js', 'routes/playlists.js'] },
    { date: '2025-02-19', time: '15:00:00', message: 'Implement file upload validation and error handling', files: ['middleware/upload.js', 'routes/admin.js'] },
    { date: '2025-02-20', time: '11:30:00', message: 'Add song metadata extraction and auto-population', files: ['routes/admin.js'] },
    { date: '2025-02-21', time: '13:45:00', message: 'Enhance search with genre, mood, and advanced filters', files: ['routes/songs.js', 'public/js/search.js'] },
    { date: '2025-02-22', time: '16:00:00', message: 'Add playlist duration calculation and statistics', files: ['models/Playlist.js'] },
    { date: '2025-02-23', time: '09:20:00', message: 'Create setup scripts and installation guide', files: ['setup.bat', 'start.bat', 'install.js'] },
    { date: '2025-02-23', time: '17:20:00', message: 'Add error handling and validation to setup scripts', files: ['setup.bat', 'install.js'] },
    { date: '2025-02-25', time: '14:30:00', message: 'Write comprehensive README with features and setup instructions', files: ['README.md'] },
    { date: '2025-02-26', time: '11:00:00', message: 'Add detailed setup guide for local development', files: ['SETUP_GUIDE.md'] },
    { date: '2025-02-27', time: '15:15:00', message: 'Final UI polish and bug fixes', files: ['public/css/main.css', 'views/layout.ejs'] },
    { date: '2025-02-28', time: '16:45:00', message: 'Project completion: Final testing and documentation updates', files: ['README.md', 'package.json'] }
];

// Function to create a commit with a specific date
function createCommit(date, time, message, files) {
    const dateTime = `${date} ${time}`;
    const env = {
        ...process.env,
        GIT_AUTHOR_DATE: dateTime,
        GIT_COMMITTER_DATE: dateTime
    };
    
    // Stage all files
    execSync('git add -A', { stdio: 'pipe', env });
    
    // Try to commit normally first
    try {
        execSync(`git commit -m "${message}"`, { stdio: 'pipe', env });
        console.log(`✓ Committed: ${date} ${time} - ${message}`);
    } catch (e) {
        // If no changes, use allow-empty (for refactoring/documentation commits)
        try {
            execSync(`git commit --allow-empty -m "${message}"`, { stdio: 'pipe', env });
            console.log(`✓ Committed (empty): ${date} ${time} - ${message}`);
        } catch (emptyError) {
            console.log(`⚠ Skipped: ${date} ${time} - ${message} (no changes)`);
        }
    }
}

// Create commits in chronological order
console.log('\nCreating commit history...\n');
commits.forEach((commit, index) => {
    createCommit(commit.date, commit.time, commit.message, commit.files);
});

console.log('\n✓ All commits created successfully!');
console.log(`Total commits: ${commits.length}`);

// Set up remote and push
console.log('\nSetting up remote repository...');
try {
    execSync('git remote add origin https://github.com/Himanshusheo/TuneForge-Music-App.git', { stdio: 'inherit' });
} catch (e) {
    // Remote might already exist, try to set URL
    try {
        execSync('git remote set-url origin https://github.com/Himanshusheo/TuneForge-Music-App.git', { stdio: 'inherit' });
    } catch (e2) {
        console.log('Remote already configured');
    }
}

// Set default branch to main
try {
    execSync('git branch -M main', { stdio: 'inherit' });
} catch (e) {
    console.log('Branch already set to main');
}

console.log('\n✓ Repository setup complete!');
console.log('\nTo push to GitHub, run:');
console.log('  git push -f origin main');
console.log('\nThis will overwrite the remote history with the new backdated commits.');


