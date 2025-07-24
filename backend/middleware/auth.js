const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Access Denied',
      message: 'No authentication token provided'
    });
  }
  
  try {
    const verified = jwt.verify(token, config.getJwtSecret());
    req.user = verified;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token Expired',
        message: 'Your session has expired. Please login again.'
      });
    }
    
    return res.status(400).json({ 
      error: 'Invalid Token',
      message: 'The provided token is invalid'
    });
  }
};

module.exports = authenticateToken;
