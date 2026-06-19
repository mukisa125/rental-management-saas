const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const subscriptionService = require('../services/subscriptionService');
const activityLogService = require('../services/activityLogService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, company, companyName, role = 'manager' } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Determine approval status based on role
    // self_owner and manager roles require approval, others are auto-approved for now
    const approvalStatus = (role === 'manager' || role === 'owner') ? 'pending' : 'approved';

    const userData = {
      name,
      email,
      password,
      phone,
      companyName: companyName || undefined,
      role,
      approvalStatus
    };

    if (company && /^[0-9a-fA-F]{24}$/.test(company)) {
      userData.company = company;
    } else if (company && !companyName) {
      userData.companyName = company;
    }

    const user = await User.create(userData);

    await activityLogService.trackRegistration(user._id, user.name, user.email, req.ip, req.headers['user-agent']);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      message: approvalStatus === 'pending' 
        ? 'Registration successful. Waiting for admin approval.' 
        : 'Registration successful. You can now login.',
      token: approvalStatus === 'pending' ? null : generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new company (self owner or manager)
// @route   POST /api/auth/register-company
// @access  Public
const registerCompany = async (req, res) => {
  try {
    const { companyName, ownerName, email, password, phone, address, role = 'self_owner' } = req.body;

    // Validate input
    if (!companyName || !ownerName || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Check if company exists
    const companyExists = await Company.findOne({ email });
    if (companyExists) {
      return res.status(400).json({ message: 'Company email already registered' });
    }

    // Create user first
    const user = await User.create({
      name: ownerName,
      email,
      password,
      phone,
      role
    });

    // Get trial plan
    const trialPlan = await SubscriptionPlan.findOne({ name: 'Trial', isActive: true });
    if (!trialPlan) {
      throw new Error('Trial plan not found');
    }

    // Create company
    const company = await Company.create({
      companyName,
      ownerName,
      email,
      phone,
      address,
      superAdmin: user._id,
      subscriptionPlan: trialPlan._id,
      subscriptionStatus: 'trial',
      billingCycle: 'monthly',
      trialEndsAt: new Date(Date.now() + trialPlan.trialDays * 24 * 60 * 60 * 1000)
    });

    // Update user with company reference
    user.company = company._id;
    user.companyName = companyName;
    await user.save();

    await activityLogService.trackRegistration(user._id, user.name, user.email, req.ip, req.headers['user-agent'], company._id);

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: company._id,
        companyName: company.companyName
      },
      company: {
        _id: company._id,
        companyName: company.companyName,
        subscriptionStatus: company.subscriptionStatus,
        trialEndsAt: company.trialEndsAt
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('company');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'User account is inactive' });
    }

    // Check approval status
    if (user.approvalStatus === 'pending') {
      return res.status(401).json({ message: 'Your account is pending approval from admin' });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(401).json({ message: `Your account has been rejected. Reason: ${user.rejectionReason}` });
    }

    // Check if company is active (if user has a company)
    if (user.company && !user.company.isActive) {
      return res.status(401).json({ message: 'Company account is inactive' });
    }

    await activityLogService.trackLogin(user._id, user.name, user.email, req.ip, req.headers['user-agent'], user.company?._id);

    res.json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      company: user.company?._id,
      companyName: user.company?.companyName || user.companyName,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('company');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;

    if (req.body.notificationPreferences) {
      user.notificationPreferences = { ...user.notificationPreferences, ...req.body.notificationPreferences };
    }

    if (req.body.password) {
      user.password = req.body.password;
      user.passwordChangedAt = new Date();
    }

    const updatedUser = await user.save();

    await activityLogService.logActivity({
      company: req.user.company,
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'profile_update',
      entity: 'user',
      entityId: user._id,
      entityName: user.name,
      description: `Updated profile`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        company: updatedUser.company,
        token: generateToken(updatedUser._id),
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    await activityLogService.trackLogout(req.user._id, req.user.name, req.user.email, req.ip, req.headers['user-agent'], req.user.company);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  registerCompany,
  loginUser,
  getUserProfile,
  updateUserProfile,
  logoutUser
};
