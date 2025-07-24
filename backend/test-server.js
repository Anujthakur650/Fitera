const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Forgot password endpoint
app.post('/api/auth/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email')
], (req, res) => {
  console.log('Forgot password request received:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format',
      errors: errors.array()
    });
  }

  const { email } = req.body;
  
  // Log the request
  console.log(`Password reset requested for: ${email}`);
  
  // Simulate successful response
  res.json({
    success: true,
    message: 'If an account exists with this email, you will receive password reset instructions.'
  });
});

// Reset password endpoint
app.post('/api/auth/reset-password', [
  body('token').notEmpty().withMessage('Token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], (req, res) => {
  console.log('Reset password request received');
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  res.json({
    success: true,
    message: 'Password reset successful'
  });
});

// Verify reset token endpoint
app.post('/api/auth/verify-reset-token', (req, res) => {
  const { token } = req.body;
  
  // Mock verification - in production this would check the database
  if (token && token.startsWith('mock-reset-token')) {
    res.json({
      success: true,
      email: 'test@example.com'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
});
