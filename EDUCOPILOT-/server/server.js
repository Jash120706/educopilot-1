const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// =====================================================
// MIDDLEWARES
// =====================================================

app.use(cors());

app.use(express.json({ limit: '20mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '20mb',
  })
);

// =====================================================
// DATABASE CONNECTION CHECK
// =====================================================

app.use((req, res, next) => {
  // Always allow health check
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }

  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error:
        'Database is currently unavailable. Please ensure MongoDB is running.',
    });
  }

  next();
});

// =====================================================
// API ROUTES
// =====================================================

app.use('/api/auth', require('./routes/auth'));

app.use('/api/student', require('./routes/student'));

app.use('/api/professor', require('./routes/professor'));

app.use('/api/rag', require('./routes/rag'));

app.use('/api/support', require('./routes/support'));

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
  });
});

app.get('/api/health', (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected';

  res.json({
    status: 'ok',
    database: dbStatus,
    service: 'EduCopilot Backend API',
    llmProvider: process.env.GROQ_API_KEY
      ? 'Groq API'
      : 'Fallback Engine (Active)',
    model:
      process.env.GROQ_MODEL || 'groq/compound-mini',
    timestamp: new Date().toISOString(),
  });
});

// =====================================================
// SERVE REACT FRONTEND
// =====================================================

// Docker structure:
//
// /app
// ├── server
// │   └── server.js
// └── client
//     └── dist
//         ├── index.html
//         └── assets
//
// Since __dirname = /app/server,
// ../client/dist = /app/client/dist

const clientPath = path.join(__dirname, '../client/dist');

// Serve React static files
app.use(express.static(clientPath));

// React Router fallback
// This allows routes such as:
// /login
// /student
// /professor
// /study-plan
// etc.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// =====================================================
// SERVER START
// =====================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    app.listen(PORT, () => {
      console.log('=========================================');
      console.log(
        `🚀 EduCopilot API Server running on port ${PORT}`
      );
      console.log(
        `🌐 Application: http://localhost:${PORT}/`
      );
      console.log(
        `🔗 Health Check: http://localhost:${PORT}/api/health`
      );
      console.log('=========================================');
    });
  } catch (error) {
    console.error(
      '❌ Failed to start server:',
      error.message
    );

    process.exit(1);
  }
};

startServer();
