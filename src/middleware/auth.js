const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, authConfig.jwt.secret, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          success: false,
          error: 'Invalid token'
        });
      } else {
        return res.status(403).json({
          success: false,
          error: 'Token verification failed'
        });
      }
    }

    // Add user info to request object
    req.user = user;
    next();
  });
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, authConfig.jwt.secret, (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name
  };

  return jwt.sign(payload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.expiresIn,
    algorithm: authConfig.jwt.algorithm
  });
};

/**
 * Refresh token middleware
 */
const refreshToken = (req, res, next) => {
  const { user } = req;
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  }

  // Generate new token
  const newToken = generateToken(user);
  
  res.json({
    success: true,
    data: {
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    }
  });
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  refreshToken
}; 