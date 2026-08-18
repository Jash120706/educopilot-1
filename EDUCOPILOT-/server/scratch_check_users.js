const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/educopilot');
    console.log('Connected to DB');
    const users = await User.find({}, 'name email role').lean();
    console.log('Users in Database:', users);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
