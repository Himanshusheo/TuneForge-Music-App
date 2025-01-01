#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎵 TuneForge Installation Script');
console.log('================================\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
    console.error('❌ Node.js version 16 or higher is required');
    console.error(`   Current version: ${nodeVersion}`);
    process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file from template');
    } else {
        // Create basic .env file
        const envContent = `PORT=3000
MONGODB_URI=mongodb://localhost:27017/tuneforge
SESSION_SECRET=tuneforge-super-secret-session-key-change-this-in-production
NODE_ENV=development
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=50000000
`;
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Created .env file with default values');
    }
} else {
    console.log('✅ .env file already exists');
}

// Create upload directories
const uploadDirs = [
    'public/uploads/songs',
    'public/uploads/covers',
    'public/uploads/avatars',
    'public/uploads/playlists'
];

uploadDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install dependencies');
    console.error(error.message);
    process.exit(1);
}

// Check if MongoDB is running
console.log('\n🗄️  Checking MongoDB connection...');
try {
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost:27017/tuneforge', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => {
        console.log('✅ MongoDB connection successful');
        mongoose.disconnect();
    }).catch((error) => {
        console.log('⚠️  MongoDB connection failed');
        console.log('   Make sure MongoDB is running on your system');
        console.log('   You can start MongoDB with: mongod');
    });
} catch (error) {
    console.log('⚠️  Could not test MongoDB connection');
}

console.log('\n🎉 TuneForge installation completed!');
console.log('\n📋 Next steps:');
console.log('   1. Make sure MongoDB is running');
console.log('   2. Update .env file with your configuration');
console.log('   3. Run: npm run dev');
console.log('   4. Open: http://localhost:3000');
console.log('\n🔧 Development commands:');
console.log('   npm run dev     - Start development server');
console.log('   npm start       - Start production server');
console.log('   npm test        - Run tests');
console.log('\n📚 Documentation:');
console.log('   README.md       - Project documentation');
console.log('   /admin          - Admin panel (after login)');
console.log('\n🎵 Happy coding with TuneForge!');
