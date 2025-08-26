const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');
const { User } = require('../database/models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

const registerValidation = [
  body('name').isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').optional().isIn(['user', 'admin']),
  body('company').optional().isLength({ max: 255 })
];

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );

    logger.info(`User ${user.email} logged in successfully`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  console.log('=== REGISTER ENDPOINT HIT ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    // Log the request body for debugging
    logger.info('Registration attempt:', { body: req.body });
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      logger.warn('Registration validation failed:', { errors: errors.array() });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role = 'user', company } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    // Create new user
    const user = await User.create({
      name,
      email,
      password_hash: password, // Will be hashed by the model hook
      role,
      company
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Get user from database
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new access token
    const newToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    logger.info(`Token refreshed for user ${user.email}`);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// Verify token endpoint
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Get user from database
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`Token verified for user ${user.email}`);

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    logger.info(`User ${req.user.email} logged out`);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email, preferences } = req.body;
    const user = await User.findByPk(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (username && username !== user.username) {
      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: 'Username already taken'
        });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }
      user.email = email;
    }

    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    logger.info(`Profile updated for user ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
