const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return user-friendly validation errors without exposing system details
      const userErrors = errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }));
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: userErrors 
      });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      // Don't reveal whether it's the email or username that exists
      return res.status(400).json({ 
        success: false,
        message: 'An account with this information already exists',
        code: 'AUTH_USER_EXISTS'
      });
    }

    // Create new user
    const user = new User({ username, email, password });
    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    // Log error securely without exposing details to client
    console.error('Registration error:', error.message);
    
    // Return generic error message
    res.status(500).json({ 
      success: false,
      message: 'Registration failed. Please try again later.',
      code: 'OPERATION_FAILED'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return user-friendly validation errors
      const userErrors = errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }));
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: userErrors 
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Use same error message for both invalid email and password
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'AUTH_INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Use same error message to prevent user enumeration
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email or password',
        code: 'AUTH_INVALID_CREDENTIALS'
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    // Log error securely without exposing details
    console.error('Login error:', error.message);
    
    // Check for specific error types
    if (error.name === 'MongoNetworkError') {
      return res.status(503).json({ 
        success: false,
        message: 'Service temporarily unavailable. Please try again later.',
        code: 'SERVICE_UNAVAILABLE'
      });
    }
    
    // Return generic error message
    res.status(500).json({ 
      success: false,
      message: 'Login failed. Please try again later.',
      code: 'OPERATION_FAILED'
    });
  }
});

module.exports = router;
