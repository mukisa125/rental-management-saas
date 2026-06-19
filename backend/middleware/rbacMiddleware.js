const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

// Authentication middleware
const protect = (req, res, next) => {
  console.log('=== AUTH MIDDLEWARE CALLED ===');
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted:', token.substring(0, 20) + '...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified, decoded:', decoded);
      
      User.findById(decoded.id).select('-password').then(async (user) => {
        if (!user) {
          console.error('User not found');
          return res.status(401).json({ message: 'User not found' });
        }

        // Check if user is active
        if (!user.isActive) {
          return res.status(401).json({ message: 'User account is inactive' });
        }
        
        // Load company data if company exists
        if (user.company) {
          const company = await Company.findById(user.company);
          if (company && !company.isActive) {
            return res.status(403).json({ message: 'Company account is inactive' });
          }
          req.company = company;
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

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Not authorized for this action',
        requiredRole: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Company isolation middleware - ensures user only accesses their company's data
const isolateCompanyData = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Super admin can access everything
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Other roles must have a company
  if (!req.user.company) {
    return res.status(403).json({ 
      message: 'User must be associated with a company',
      role: req.user.role
    });
  }

  // Check if company is active
  if (req.company && !req.company.isActive) {
    return res.status(403).json({ message: 'Company is not active' });
  }

  // Attach company ID to request for query filtering
  req.companyId = req.user.company;
  next();
};

// Permission middleware for specific resource access
const checkOwnershipOrManager = async (req, res, next) => {
  try {
    const resourceId = req.params.id;
    let resource = null;
    let resourceOwner = null;
    let resourceCompany = null;

    // Determine the model and get owner
    if (req.path.includes('/properties')) {
      const Property = require('../models/Property');
      resource = await Property.findById(resourceId);
      resourceOwner = resource?.owner.toString();
      resourceCompany = resource?.company.toString();
    } else if (req.path.includes('/tenants')) {
      const Tenant = require('../models/Tenant');
      resource = await Tenant.findById(resourceId);
      resourceOwner = resource?.owner.toString();
      resourceCompany = resource?.company.toString();
    } else if (req.path.includes('/payments')) {
      const Payment = require('../models/Payment');
      resource = await Payment.findById(resourceId);
      resourceOwner = resource?.owner.toString();
      resourceCompany = resource?.company.toString();
    } else if (req.path.includes('/maintenance')) {
      const Maintenance = require('../models/Maintenance');
      resource = await Maintenance.findById(resourceId);
      resourceOwner = resource?.owner.toString();
      resourceCompany = resource?.company.toString();
    } else if (req.path.includes('/units')) {
      const Unit = require('../models/Unit');
      resource = await Unit.findById(resourceId);
      resourceOwner = resource?.owner.toString();
      resourceCompany = resource?.company.toString();
    }

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }

    const userId = req.user._id.toString();
    const userCompany = req.user.company?.toString();
    const isManager = req.user.role === 'manager';
    const isOwner = req.user.role === 'owner' || req.user.role === 'self_owner';
    const isSuperAdmin = req.user.role === 'super_admin';

    // Super admin can access everything
    if (isSuperAdmin) {
      return next();
    }

    // Check company isolation
    if (userCompany !== resourceCompany) {
      return res.status(403).json({ 
        message: 'Cannot access resources from another company'
      });
    }

    // Owner can access their own resources
    if (isOwner && resourceOwner === userId) {
      return next();
    }

    // Manager can access all resources in their company
    if (isManager) {
      return next();
    }

    // Default: deny access
    return res.status(403).json({ message: 'Not authorized to access this resource' });

  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check specific permissions
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        message: 'Missing required permission',
        required: requiredPermission
      });
    }

    next();
  };
};

// Check subscription limits
const checkSubscriptionLimit = async (req, res, next) => {
  try {
    if (!req.user.company) {
      return next(); // Super admin bypass
    }

    const Company = require('../models/Company');
    const company = await Company.findById(req.user.company).populate('subscriptionPlan');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const plan = company.subscriptionPlan;

    // Store limits info in request for later use
    req.subscriptionLimits = {
      maxProperties: plan.maxProperties,
      maxUnits: plan.maxUnits,
      maxManagers: plan.maxManagers,
      maxOwners: plan.maxOwners,
      maxTenants: plan.maxTenants,
      currentProperties: company.totalProperties,
      currentUnits: company.totalUnits,
      currentManagers: company.totalManagers,
      currentOwners: company.totalOwners,
      currentTenants: company.totalTenants
    };

    next();
  } catch (error) {
    console.error('Error checking subscription limits:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  protect,
  authorize,
  isolateCompanyData,
  checkOwnershipOrManager,
  checkPermission,
  checkSubscriptionLimit
};
