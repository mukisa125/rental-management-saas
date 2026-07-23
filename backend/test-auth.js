require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find a self_owner user
  const selfOwner = await User.findOne({ role: 'self_owner' }).populate('company');
  console.log('Found self_owner:', selfOwner ? selfOwner.email : 'NONE');
  
  // Check all roles
  const users = await User.find({}, 'email role company').lean();
  users.forEach(u => console.log(`  role=${u.role} email=${u.email} hasCompany=${!!u.company}`));
  
  mongoose.connection.close();
}

test().catch(err => { console.error(err.message); process.exit(1); });
