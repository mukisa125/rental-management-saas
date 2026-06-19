require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const Property = require('./models/Property');
const Unit = require('./models/Unit');
const Tenant = require('./models/Tenant');
const Payment = require('./models/Payment');
const Maintenance = require('./models/Maintenance');
const SystemSettings = require('./models/SystemSettings');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rental-management');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Company.deleteMany({});
    await SubscriptionPlan.deleteMany({});
    await Property.deleteMany({});
    await Unit.deleteMany({});
    await Tenant.deleteMany({});
    await Payment.deleteMany({});
    await Maintenance.deleteMany({});
    console.log('Cleared existing data');

    // Create subscription plans first
    const plans = await SubscriptionPlan.insertMany([
      {
        name: 'Trial',
        monthlyPrice: 0,
        annualPrice: 0,
        trialDays: 14,
        description: 'Free trial to explore the platform',
        limits: {
          maxProperties: 3,
          maxUnits: 10,
          maxTenants: 20,
          maxUsers: 2,
          storageGB: 5,
          monthlyTransactions: 10
        },
        features: {
          propertyManagement: true,
          tenantManagement: true,
          paymentTracking: true,
          maintenanceTracking: true,
          documentStorage: true,
          api: false,
          customReports: false,
          apiCalls: 0
        },
        active: true
      },
      {
        name: 'Starter',
        monthlyPrice: 29.99,
        annualPrice: 299.90,
        trialDays: 0,
        description: 'Perfect for small property managers',
        limits: {
          maxProperties: 10,
          maxUnits: 50,
          maxTenants: 100,
          maxUsers: 5,
          storageGB: 50,
          monthlyTransactions: 100
        },
        features: {
          propertyManagement: true,
          tenantManagement: true,
          paymentTracking: true,
          maintenanceTracking: true,
          documentStorage: true,
          api: false,
          customReports: false,
          apiCalls: 0
        },
        active: true
      },
      {
        name: 'Professional',
        monthlyPrice: 99.99,
        annualPrice: 999.90,
        trialDays: 0,
        description: 'For growing property management companies',
        limits: {
          maxProperties: 50,
          maxUnits: 500,
          maxTenants: 1000,
          maxUsers: 20,
          storageGB: 500,
          monthlyTransactions: 1000
        },
        features: {
          propertyManagement: true,
          tenantManagement: true,
          paymentTracking: true,
          maintenanceTracking: true,
          documentStorage: true,
          api: true,
          customReports: true,
          apiCalls: 10000
        },
        active: true
      },
      {
        name: 'Business',
        monthlyPrice: 299.99,
        annualPrice: 2999.90,
        trialDays: 0,
        description: 'For established property management firms',
        limits: {
          maxProperties: 500,
          maxUnits: 5000,
          maxTenants: 10000,
          maxUsers: 100,
          storageGB: 5000,
          monthlyTransactions: 10000
        },
        features: {
          propertyManagement: true,
          tenantManagement: true,
          paymentTracking: true,
          maintenanceTracking: true,
          documentStorage: true,
          api: true,
          customReports: true,
          apiCalls: 100000
        },
        active: true
      },
      {
        name: 'Enterprise',
        monthlyPrice: 999.99,
        annualPrice: 9999.90,
        trialDays: 0,
        description: 'For large-scale operations',
        limits: {
          maxProperties: 10000,
          maxUnits: 100000,
          maxTenants: 1000000,
          maxUsers: 500,
          storageGB: 50000,
          monthlyTransactions: 1000000
        },
        features: {
          propertyManagement: true,
          tenantManagement: true,
          paymentTracking: true,
          maintenanceTracking: true,
          documentStorage: true,
          api: true,
          customReports: true,
          apiCalls: 1000000
        },
        active: true
      }
    ]);
    console.log('Created subscription plans:', plans.length);

    // Create super admin user first (without company)
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@rentsaas.com',
      password: 'AdminPassword123',
      phone: '+256 700 000 000',
      role: 'super_admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date()
    });
    console.log('Created super admin user:', superAdmin.email);

    // Create super admin company with all required fields
    const superAdminCompany = await Company.create({
      companyName: 'Rental Management SaaS Platform',
      ownerName: 'Super Admin',
      email: 'admin@rentsaas.com',
      phone: '+256 700 000 000',
      superAdmin: superAdmin._id,
      subscriptionPlan: plans[4]._id, // Enterprise plan
      subscriptionStatus: 'active',
      billingCycle: 'monthly',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    console.log('Created super admin company');

    // Update super admin user with company reference
    superAdmin.company = superAdminCompany._id;
    await superAdmin.save();

    console.log('Super Admin Credentials - Email: admin@rentsaas.com | Password: AdminPassword123');

    // Create manager user
    const manager = await User.create({
      name: 'Mark Mukisa',
      email: 'mark@example.com',
      password: 'password123',
      phone: '+256 700 123 456',
      role: 'manager',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark',
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date()
    });
    console.log('Created manager user:', manager.email);

    // Create owner demo account
    const owner = await User.create({
      name: 'Demo Owner',
      email: 'owner@example.com',
      password: 'password123',
      phone: '+256 700 888 999',
      role: 'owner',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Owner',
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date()
    });
    console.log('Created owner user:', owner.email);

    // Create tenant demo account
    const tenantUser = await User.create({
      name: 'Demo Tenant',
      email: 'tenant@example.com',
      password: 'password123',
      phone: '+256 700 777 666',
      role: 'tenant',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tenant',
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date()
    });
    console.log('Created tenant user:', tenantUser.email);

    // Create additional tenant users for existing tenants
    const johnUser = await User.create({
      name: 'John Smith',
      email: 'john@example.com',
      password: 'password123',
      phone: '+256 700 111 222',
      role: 'tenant',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date()
    });

    const janeUser = await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      phone: '+256 700 333 444',
      role: 'tenant',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date()
    });

    const robertUser = await User.create({
      name: 'Robert Johnson',
      email: 'robert@example.com',
      password: 'password123',
      phone: '+256 700 555 666',
      role: 'tenant',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date()
    });

    console.log('Created additional tenant users');

    console.log('\n✅ Database seeded successfully!');
    console.log('='.repeat(60));
    console.log('SUPER ADMIN LOGIN CREDENTIALS:');
    console.log('Email: admin@rentsaas.com');
    console.log('Password: AdminPassword123');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
