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
  if (
    req.path === '/api/health' ||
    req.path === '/health'
  ) {
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
// AI SERVICE PROXY
// =====================================================
//
// Public:
// http://16.192.179.216:5000/api/ai/...
//
// Internal:
// http://educopilot-ai-container:8000/...
//
// The AI service remains private inside Docker.
// =====================================================

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  'http://localhost:8000';

app.use('/api/ai', async (req, res) => {
  try {
    // Remove /api/ai from the request path
    const aiPath = req.originalUrl.replace(/^\/api\/ai/, '');

    const targetUrl = `${AI_SERVICE_URL}${aiPath || '/'}`;

    console.log('=========================================');
    console.log('AI SERVICE REQUEST');
    console.log('Method:', req.method);
    console.log('Target:', targetUrl);
    console.log('=========================================');

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
    };

    // Forward authorization if present
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }

    // Prepare fetch options
    const options = {
      method: req.method,
      headers,
    };

    // Send body for methods that support a body
    if (
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      req.body &&
      Object.keys(req.body).length > 0
    ) {
      options.body = JSON.stringify(req.body);
    }

    // Call Python AI service
    const response = await fetch(targetUrl, options);

    const contentType =
      response.headers.get('content-type') || '';

    const responseText = await response.text();

    // Preserve response status
    res.status(response.status);

    // Return JSON response
    if (contentType.includes('application/json')) {
      try {
        const jsonResponse = JSON.parse(responseText);

        return res.json(jsonResponse);
      } catch (parseError) {
        return res.send(responseText);
      }
    }

    // Return non-JSON response
    return res.send(responseText);

  } catch (error) {
    console.error('=========================================');
    console.error('AI SERVICE ERROR');
    console.error(error.message);
    console.error('=========================================');

    return res.status(503).json({
      success: false,
      error: 'AI service is currently unavailable',
      details: error.message,
    });
  }
});

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
    aiService:
      process.env.AI_SERVICE_URL ||
      'http://localhost:8000',
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

const clientPath = path.join(
  __dirname,
  '../client/dist'
);

// Serve React static files
app.use(express.static(clientPath));

// =====================================================
// REACT ROUTER FALLBACK
// =====================================================

app.get('*', (req, res) => {
  res.sendFile(
    path.join(clientPath, 'index.html')
  );
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error(
    '[Server Error]',
    err.stack || err
  );

  res.status(err.status || 500).json({
    error:
      err.message ||
      'Internal Server Error',
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

    app.listen(PORT, '0.0.0.0', () => {
      console.log('=========================================');
      console.log(
        `🚀 EduCopilot API Server running on port ${PORT}`
      );
      console.log(
        `🌐 Application: http://0.0.0.0:${PORT}/`
      );
      console.log(
        `🔗 Health Check: http://0.0.0.0:${PORT}/api/health`
      );
      console.log(
        `🤖 AI Service: ${AI_SERVICE_URL}`
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
