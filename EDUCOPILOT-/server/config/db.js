const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/educopilot';
  const localUri = 'mongodb://127.0.0.1:27017/educopilot';

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[Database] Primary MongoDB connection failed (${error.message}). Trying local MongoDB...`);
    try {
      const conn = await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`[Database] MongoDB Connected (Local): ${conn.connection.host}`);
      return true;
    } catch (fallbackErr) {
      console.warn(`[Database] Local MongoDB connection note (${fallbackErr.message}). App running in decoupled DB mode.`);
      return false;
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection lost.');
});

module.exports = connectDB;
