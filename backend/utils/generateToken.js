const jwt = require('jsonwebtoken');
const config = require('../config');

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      username: user.username, 
      email: user.email 
    },
    config.jwt.secret,
    { 
      expiresIn: config.jwt.expire,
      issuer: 'StrongClone',
      audience: 'StrongClone-App'
    }
  );
};

module.exports = generateToken;
