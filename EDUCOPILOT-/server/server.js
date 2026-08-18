const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const connectDB = require('./config/db');

// =====================================================
// LOAD ENVIRONMENT VARIABLES
// =====================================================

dotenv.config();

const app = express();

// =====================================================
// CONFIGURATION
// =====================================================

const PORT = process.env.PORT || 5000;

const AI_SERVICE_HOST = '127.0.0.1';
const AI_SERVICE_PORT = 8000;

// =====================================================
// AI SERVICE PROCESS
// =====================================================

let aiProcess = null;

// =====================================================
// START PYTHON AI SERVICE
// =====================================================

const startAIService = () => {

  console.log('=========================================');
  console.log('🤖 STARTING PYTHON AI SERVICE');
  console.log('=========================================');

  const aiPath = path.join(__dirname, '../ai_service');

  console.log(`📁 AI Service Path: ${aiPath}`);

  aiProcess = spawn(
    'python3',
    ['main.py'],
    {
      cwd: aiPath,

      env: {
        ...process.env,

        PYTHONUNBUFFERED: '1',

        HOST: '0.0.0.0',

        PORT: String(AI_SERVICE_PORT)
      },

      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  // ===================================================
  // AI STDOUT
  // ===================================================

  aiProcess.stdout.on('data', (data) => {

    console.log(
      `[AI Service] ${data.toString().trim()}`
    );

  });

  // ===================================================
  // AI STDERR
  // ===================================================

  aiProcess.stderr.on('data', (data) => {

    console.error(
      `[AI Service] ${data.toString().trim()}`
    );

  });

  // ===================================================
  // AI PROCESS ERROR
  // ===================================================

  aiProcess.on('error', (error) => {

    console.error(
      '❌ Failed to start Python AI service:',
      error.message
    );

  });

  // ===================================================
  // AI PROCESS EXIT
  // ===================================================

  aiProcess.on('exit', (code, signal) => {

    console.log(
      `⚠️ Python AI service stopped. code=${code}, signal=${signal}`
    );

  });

  console.log(
    `🤖 AI Service starting on http://${AI_SERVICE_HOST}:${AI_SERVICE_PORT}`
  );
};

// =====================================================
// CHECK AI SERVICE
// =====================================================

const checkAIService = () => {

  return new Promise((resolve) => {

    const req = http.get(
      `http://${AI_SERVICE_HOST}:${AI_SERVICE_PORT}/health`,

      (res) => {

        let data = '';

        res.on('data', (chunk) => {

          data += chunk;

        });

        res.on('end', () => {

          if (res.statusCode === 200) {

            resolve({
              ready: true,
              statusCode: res.statusCode,
              data
            });

          } else {

            resolve({
              ready: false,
              statusCode: res.statusCode,
              data
            });

          }

        });

      }
    );

    req.on('error', () => {

      resolve({
        ready: false,
        statusCode: 0,
        data: null
      });

    });

    req.setTimeout(3000, () => {

      req.destroy();

      resolve({
        ready: false,
        statusCode: 0,
        data: null
      });

    });

  });

};

// =====================================================
// WAIT FOR AI SERVICE
// =====================================================

const waitForAIService = async () => {

  console.log('=========================================');
  console.log('⏳ WAITING FOR AI SERVICE');
  console.log('=========================================');

  for (let attempt = 1; attempt <= 60; attempt++) {

    const result = await checkAIService();

    if (result.ready) {

      console.log('=========================================');
      console.log('✅ PYTHON AI SERVICE READY');
      console.log('=========================================');

      console.log(
        `[AI Health] ${result.data}`
      );

      return true;
    }

    console.log(
      `⏳ AI service not ready... attempt ${attempt}/60`
    );

    await new Promise((resolve) => {

      setTimeout(resolve, 2000);

    });

  }

  console.error(
    '❌ Python AI service did not become ready.'
  );

  return false;
};

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(
  express.json({
    limit: '20mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '20mb'
  })
);

// =====================================================
// DATABASE CONNECTION CHECK
// =====================================================

app.use((req, res, next) => {

  // Always allow health checks

  if (
    req.path === '/api/health' ||
    req.path === '/health'
  ) {

    return next();

  }

  // Check MongoDB

  if (mongoose.connection.readyState !== 1) {

    return res.status(503).json({

      error:
        'Database is currently unavailable. Please ensure MongoDB is running.'

    });

  }

  next();

});

// =====================================================
// API ROUTES
// =====================================================

app.use(
  '/api/auth',
  require('./routes/auth')
);

app.use(
  '/api/student',
  require('./routes/student')
);

app.use(
  '/api/professor',
  require('./routes/professor')
);

app.use(
  '/api/rag',
  require('./routes/rag')
);

app.use(
  '/api/support',
  require('./routes/support')
);

// =====================================================
// AI SERVICE PROXY
//
// Public:
// /api/ai/...
//
// Internal:
// http://127.0.0.1:8000/...
// =====================================================

app.use('/api/ai', (req, res) => {

  const aiPath =
    req.originalUrl.replace('/api/ai', '') || '/';

  console.log(
    `🤖 AI Request: ${req.method} ${req.originalUrl}`
  );

  const options = {

    hostname: AI_SERVICE_HOST,

    port: AI_SERVICE_PORT,

    path: aiPath,

    method: req.method,

    headers: {
      ...req.headers,

      host:
        `${AI_SERVICE_HOST}:${AI_SERVICE_PORT}`,

      connection: 'close'
    }

  };

  const proxyReq = http.request(
    options,

    (proxyRes) => {

      res.status(
        proxyRes.statusCode || 500
      );

      // Forward headers

      Object.keys(proxyRes.headers).forEach(
        (header) => {

          const value =
            proxyRes.headers[header];

          if (value !== undefined) {

            res.setHeader(
              header,
              value
            );

          }

        }
      );

      proxyRes.pipe(res);

    }
  );

  proxyReq.on('error', (error) => {

    console.error(
      '❌ AI proxy error:',
      error.message
    );

    if (!res.headersSent) {

      res.status(503).json({

        error:
          'AI service is temporarily unavailable.'

      });

    }

  });

  proxyReq.setTimeout(
    120000,
    () => {

      console.error(
        '❌ AI request timeout'
      );

      proxyReq.destroy();

      if (!res.headersSent) {

        res.status(504).json({

          error:
            'AI service request timed out.'

        });

      }

    }
  );

  // ===================================================
  // FORWARD REQUEST BODY
  // ===================================================

  if (
    req.body &&
    Object.keys(req.body).length > 0
  ) {

    proxyReq.write(
      JSON.stringify(req.body)
    );

  }

  proxyReq.end();

});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/health', (req, res) => {

  res.json({

    status: 'ok',

    service:
      'EduCopilot Backend API'

  });

});

// =====================================================
// API HEALTH CHECK
// =====================================================

app.get('/api/health', async (req, res) => {

  const dbStatus =
    mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected';

  const aiResult =
    await checkAIService();

  res.json({

    status: 'ok',

    database: dbStatus,

    service:
      'EduCopilot Backend API',

    llmProvider:
      process.env.GROQ_API_KEY
        ? 'Groq API'
        : 'Fallback Engine (Active)',

    model:
      process.env.GROQ_MODEL ||
      'llama-3.3-70b-versatile',

    aiService: {

      status:
        aiResult.ready
          ? 'connected'
          : 'disconnected',

      internalHost:
        AI_SERVICE_HOST,

      internalPort:
        AI_SERVICE_PORT,

      internalUrl:
        `http://${AI_SERVICE_HOST}:${AI_SERVICE_PORT}`

    },

    timestamp:
      new Date().toISOString()

  });

});

// =====================================================
// SERVE REACT FRONTEND
// =====================================================

const clientPath =
  path.join(
    __dirname,
    '../client/dist'
  );

console.log(
  `📁 Client Path: ${clientPath}`
);

app.use(
  express.static(clientPath)
);

// =====================================================
// REACT ROUTER FALLBACK
// =====================================================

app.get('*', (req, res) => {

  res.sendFile(
    path.join(
      clientPath,
      'index.html'
    )
  );

});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (err, req, res, next) => {

    console.error(
      '[Server Error]',
      err.stack || err
    );

    res.status(
      err.status || 500
    ).json({

      error:
        err.message ||
        'Internal Server Error'

    });

  }
);

// =====================================================
// START SERVER
// =====================================================

const startServer = async () => {

  try {

    // =================================================
    // CONNECT MONGODB
    // =================================================

    console.log(
      '🔄 Connecting to MongoDB...'
    );

    await connectDB();

    console.log(
      '✅ MongoDB connected'
    );

    // =================================================
    // START PYTHON AI SERVICE
    // =================================================

    startAIService();

    // =================================================
    // START NODE SERVER
    // =================================================

    app.listen(
      PORT,
      '0.0.0.0',
      async () => {

        console.log(
          '========================================='
        );

        console.log(
          `🚀 EduCopilot Backend running on port ${PORT}`
        );

        console.log(
          `🌐 Application: http://0.0.0.0:${PORT}/`
        );

        console.log(
          `🔗 Health: http://0.0.0.0:${PORT}/api/health`
        );

        console.log(
          `🤖 Internal AI: http://${AI_SERVICE_HOST}:${AI_SERVICE_PORT}`
        );

        console.log(
          '========================================='
        );

        // Wait for AI

        const aiReady =
          await waitForAIService();

        if (!aiReady) {

          console.error(
            '⚠️ WARNING: AI service is not ready.'
          );

        }

      }
    );

  } catch (error) {

    console.error(
      '❌ Failed to start server:',
      error.message
    );

    process.exit(1);

  }

};

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

const shutdown = () => {

  console.log(
    '🛑 Shutting down EduCopilot...'
  );

  if (aiProcess) {

    console.log(
      '🛑 Stopping Python AI service...'
    );

    aiProcess.kill(
      'SIGTERM'
    );

  }

  process.exit(0);

};

process.on(
  'SIGTERM',
  shutdown
);

process.on(
  'SIGINT',
  shutdown
);

// =====================================================
// START
// =====================================================

startServer();
