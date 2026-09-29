const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

if (!process.env.ADMIN_SEED_PASSWORD) {
  console.error('Set ADMIN_SEED_PASSWORD in backend/.env before running this script.');
  process.exit(1);
}
const { hashPassword } = require('../src/utils/password');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    async function fixAdmin(email) {
      const h = hashPassword(process.env.ADMIN_SEED_PASSWORD);
      const res = await mongoose.connection.db.collection('admins').updateOne(
        { email: email },
        { 
          $set: { 
            passwordSalt: h.salt, 
            passwordHash: h.hash, 
            passwordIterations: h.iterations,
            disabled: false,
            role: 'admin'
          } 
        },
        { upsert: true }
      );
      console.log(`Updated ${email}:`, res.acknowledged);
    }

    await fixAdmin('admin@trans.com');
    await fixAdmin('panchalajay717@gmail.com');

    console.log('Admin accounts synchronized with correct security formatting.');
    process.exit(0);
  } catch (err) {
    console.error('Registration Failed:', err);
    process.exit(1);
  }
}

run();
