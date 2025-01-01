// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/auth/login');
  }
};

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    req.flash('error', 'Admin access required');
    return res.redirect('/');
  }
};

// Premium access middleware
const requirePremium = (req, res, next) => {
  if (req.session && req.session.user) {
    const user = req.session.user;
    if (user.subscription && user.subscription.type !== 'free' && user.subscription.isActive) {
      return next();
    } else {
      req.flash('error', 'Premium subscription required for this feature');
      return res.redirect('/subscription');
    }
  } else {
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/auth/login');
  }
};

// Guest middleware (redirect if logged in)
const requireGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  } else {
    return next();
  }
};

// Check if user is premium (doesn't redirect, just adds to locals)
const checkPremium = (req, res, next) => {
  if (req.session && req.session.user) {
    const user = req.session.user;
    res.locals.isPremium = user.subscription && 
                          user.subscription.type !== 'free' && 
                          user.subscription.isActive;
  } else {
    res.locals.isPremium = false;
  }
  next();
};

// Check if user is admin (doesn't redirect, just adds to locals)
const checkAdmin = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.isAdmin = req.session.user.role === 'admin';
  } else {
    res.locals.isAdmin = false;
  }
  next();
};

// Add user to locals for all requests
const addUserToLocals = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    res.locals.isLoggedIn = true;
  } else {
    res.locals.user = null;
    res.locals.isLoggedIn = false;
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  requirePremium,
  requireGuest,
  checkPremium,
  checkAdmin,
  addUserToLocals
};
