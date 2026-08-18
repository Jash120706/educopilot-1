const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Database connection check middleware
app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database is currently unavailable. Please ensure MongoDB is running.',
    });
  }
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/professor', require('./routes/professor'));
app.use('/api/rag', require('./routes/rag'));
app.use('/api/support', require('./routes/support'));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    database: dbStatus,
    service: 'EduCopilot Backend API',
    llmProvider: process.env.GROQ_API_KEY ? 'Groq API' : 'Fallback Engine (Active)',
    model: process.env.GROQ_MODEL || 'groq/compound-mini',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect Database first
  await connectDB();

  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 EduCopilot API Server running on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });
};

startServer();
