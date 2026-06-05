const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = (req, res, next) => {
  console.log('=== AUTH MIDDLEWARE CALLED ===');
  console.log('Type of next:', typeof next);
  console.log('next value:', next);

  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted:', token.substring(0, 20) + '...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified, decoded:', decoded);
      
      User.findById(decoded.id).select('-password').then((user) => {
        if (!user) {
          console.error('User not found');
          return res.status(401).json({ message: 'User not found' });
        }
        
        console.log('User found, calling next()');
        req.user = user;
        next();
      }).catch((dbError) => {
        console.error('Database error:', dbError);
        res.status(500).json({ message: 'Server error' });
      });
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    console.log('No valid auth header');
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
