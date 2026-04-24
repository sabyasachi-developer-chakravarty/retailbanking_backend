const User = require('../models/User');
const Role = require('../models/Role');
const { generateToken } = require('../utils/jwt');
const { logAudit } = require('../middleware/audit');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user and select password field
    const user = await User.findOne({ username }).select('+password').populate('role');

    if (!user) {
      await logAudit(null, 'LOGIN_FAILED', 'User', username, null, 'FAILURE', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await logAudit(user._id, 'LOGIN_FAILED', 'User', user._id, null, 'FAILURE', req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'User account is inactive' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Log successful login
    await logAudit(user._id, 'LOGIN_SUCCESS', 'User', user._id, null, 'SUCCESS', req);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Verify role exists
    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role
    });

    await user.save();

    // Log user creation
    await logAudit(user._id, 'USER_CREATED', 'User', user._id, null, 'SUCCESS', req);

    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const validateToken = async (req, res) => {
  try {
    res.json({
      valid: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Token validation failed' });
  }
};

module.exports = {
  login,
  register,
  validateToken
};
