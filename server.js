const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const flash = require('connect-flash');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "blob:"]
    }
  }
}));

app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'tuneforge-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/tuneforge'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Flash messages
app.use(flash());

// Add user to locals for all requests
app.use(require('./middleware/auth').addUserToLocals);

// Add request object to locals for templates
app.use((req, res, next) => {
  res.locals.req = req;
  next();
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tuneforge', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/songs', require('./routes/songs'));
app.use('/playlists', require('./routes/playlists'));
app.use('/admin', require('./routes/admin'));
app.use('/api', require('./routes/api'));

// Main routes
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'TuneForge - Music Streaming Platform',
    user: req.session.user 
  });
});

app.get('/dashboard', require('./middleware/auth').requireAuth, (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard - TuneForge',
    user: req.session.user 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Error - TuneForge',
    error: process.env.NODE_ENV === 'development' ? err : {},
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { 
    title: 'Page Not Found - TuneForge',
    user: req.session.user 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 TuneForge server running on http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Server started at ${new Date().toLocaleString()}`);
});

module.exports = app;
