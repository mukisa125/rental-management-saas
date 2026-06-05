require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Property = require('./models/Property');
const Unit = require('./models/Unit');
const Tenant = require('./models/Tenant');
const Payment = require('./models/Payment');
const Maintenance = require('./models/Maintenance');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rental-management');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Property.deleteMany({});
    await Unit.deleteMany({});
    await Tenant.deleteMany({});
    await Payment.deleteMany({});
    await Maintenance.deleteMany({});
    console.log('Cleared existing data');

    // Create user
    const user = await User.create({
      name: 'Mark Mukisa',
      email: 'mark@example.com',
      password: 'password123',
      phone: '+256 700 123 456',
      company: 'Mukisa Properties Ltd',
      role: 'manager',
    });
    console.log('Created user:', user.email);

    // Create properties
    const properties = await Property.insertMany([
      {
        name: 'Sunset Apartments',
        location: 'Kampala, Uganda',
        description: 'Modern apartment complex with amenities',
        totalUnits: 12,
        occupiedUnits: 10,
        status: 'active',
        owner: user._id,
      },
      {
        name: 'Green Valley Residences',
        location: 'Entebbe, Uganda',
        description: 'Luxury residential units',
        totalUnits: 8,
        occupiedUnits: 6,
        status: 'active',
        owner: user._id,
      },
      {
        name: 'City Center Lofts',
        location: 'Kampala CBD',
        description: 'Downtown living spaces',
        totalUnits: 6,
        occupiedUnits: 4,
        status: 'active',
        owner: user._id,
      },
    ]);
    console.log('Created properties:', properties.length);

    // Create units
    const units = [];
    properties.forEach((property) => {
      for (let i = 1; i <= property.totalUnits; i++) {
        units.push({
          unitNumber: `${property.name.substring(0, 3).toUpperCase()}-${i.toString().padStart(3, '0')}`,
          property: property._id,
          rentAmount: 500000 + Math.floor(Math.random() * 500000),
          bedrooms: Math.floor(Math.random() * 3) + 1,
          bathrooms: Math.floor(Math.random() * 2) + 1,
          area: 50 + Math.floor(Math.random() * 100),
          status: i <= property.occupiedUnits ? 'occupied' : 'vacant',
        });
      }
    });
    const createdUnits = await Unit.insertMany(units);
    console.log('Created units:', createdUnits.length);

    // Create tenants
    const tenants = await Tenant.insertMany([
      {
        fullName: 'John Smith',
        email: 'john@example.com',
        phone: '+256 700 111 222',
        property: properties[0]._id,
        unit: createdUnits[0]._id,
        leaseStart: new Date('2024-01-01'),
        leaseEnd: new Date('2024-12-31'),
        status: 'active',
      },
      {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+256 700 333 444',
        property: properties[0]._id,
        unit: createdUnits[1]._id,
        leaseStart: new Date('2024-02-01'),
        leaseEnd: new Date('2025-01-31'),
        status: 'active',
      },
      {
        fullName: 'Robert Johnson',
        email: 'robert@example.com',
        phone: '+256 700 555 666',
        property: properties[1]._id,
        unit: createdUnits[12]._id,
        leaseStart: new Date('2024-03-01'),
        leaseEnd: new Date('2025-02-28'),
        status: 'active',
      },
    ]);
    console.log('Created tenants:', tenants.length);

    // Update units with current tenant
    for (let i = 0; i < tenants.length; i++) {
      await Unit.findByIdAndUpdate(tenants[i].unit, { currentTenant: tenants[i]._id });
    }

    // Create payments
    const payments = [];
    tenants.forEach((tenant) => {
      for (let month = 0; month < 6; month++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() - month);
        
        const paidDate = month < 4 ? new Date(dueDate) : null;
        const status = month < 4 ? 'paid' : month === 4 ? 'pending' : 'overdue';

        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        payments.push({
          tenant: tenant._id,
          property: tenant.property,
          unit: tenant.unit,
          amount: 500000 + Math.floor(Math.random() * 300000),
          dueDate,
          paidDate,
          status,
          paymentMethod: 'bank_transfer',
          receiptNumber: `RCP-${timestamp}-${random}`,
        });
      }
    });
    await Payment.insertMany(payments);
    console.log('Created payments:', payments.length);

    // Create maintenance requests
    const timestamp1 = Date.now().toString(36).toUpperCase();
    const random1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp2 = Date.now().toString(36).toUpperCase();
    const random2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp3 = Date.now().toString(36).toUpperCase();
    const random3 = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const maintenance = await Maintenance.insertMany([
      {
        requestId: `MTN-${timestamp1}-${random1}`,
        tenant: tenants[0]._id,
        property: properties[0]._id,
        unit: createdUnits[0]._id,
        issue: 'Leaking faucet',
        description: 'Kitchen sink faucet is leaking constantly',
        priority: 'medium',
        status: 'open',
      },
      {
        requestId: `MTN-${timestamp2}-${random2}`,
        tenant: tenants[1]._id,
        property: properties[0]._id,
        unit: createdUnits[1]._id,
        issue: 'AC not working',
        description: 'Air conditioning unit not cooling properly',
        priority: 'high',
        status: 'in_progress',
      },
      {
        requestId: `MTN-${timestamp3}-${random3}`,
        tenant: tenants[2]._id,
        property: properties[1]._id,
        unit: createdUnits[12]._id,
        issue: 'Broken window',
        description: 'Bedroom window has a crack',
        priority: 'low',
        status: 'resolved',
      },
    ]);
    console.log('Created maintenance requests:', maintenance.length);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
