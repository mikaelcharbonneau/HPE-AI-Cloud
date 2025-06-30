const express = require('express');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Import configuration and middleware
const { testConnection, closePool } = require('./src/config/database');
const {
  generalLimiter,
  authLimiter,
  apiLimiter,
  corsOptions,
  securityHeaders,
  sanitizeInput,
  requestLogger
} = require('./src/middleware/security');
const cors = require('cors');

// Import route handlers
const authRoutes = require('./src/routes/auth');
const auditRoutes = require('./src/routes/audits');
const issueRoutes = require('./src/routes/issues');
const dashboardRoutes = require('./src/routes/dashboard');
const reportRoutes = require('./src/routes/reports');
const incidentRoutes = require('./src/routes/incidents');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;



// Trust proxy for accurate IP addresses (important for Azure App Service)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom request logging
app.use(requestLogger);

// Input sanitization
app.use(sanitizeInput);

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
app.use(generalLimiter);

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/incidents', incidentRoutes);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  // Handle React routing - send all non-API requests to React
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
} else {
  // Development welcome message
  app.get('/', (req, res) => {
    res.json({
      message: 'HPE Datacenter Audit Tool API',
      version: '1.0.0',
      environment: 'development',
      endpoints: {
        authentication: '/api/auth',
        audits: '/api/audits',
        issues: '/api/issues',
        dashboard: '/api/dashboard',
        reports: '/api/reports',
        incidents: '/api/incidents'
      },
      documentation: 'See README.md for API documentation'
    });
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error occurred:', error);

  // Database connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      error: 'Database connection failed'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Database constraint errors
  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'Resource already exists'
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced resource does not exist'
    });
  }

  // Default error
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('\n🔄 Received shutdown signal. Closing server gracefully...');
  
  try {
    await closePool();
    console.log('✅ Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Nodemon restart

// Start server
const startServer = async () => {
  try {
    // Test database connection before starting server
    console.log('🔌 Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Failed to connect to database. Server will not start.');
      process.exit(1);
    }

    // Start the server
    const server = app.listen(port, () => {
      console.log('\n🚀 HPE Datacenter Audit Tool Server Started!');
      console.log(`📡 Server running on port ${port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: Connected and ready`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n📖 API Documentation:`);
        console.log(`   Health Check: http://localhost:${port}/health`);
        console.log(`   API Base URL: http://localhost:${port}/api`);
        console.log(`   Frontend URL: http://localhost:3000 (when React app is running)`);
      } else {
        console.log(`\n🌐 Production URL: https://${process.env.AZURE_APP_SERVICE_NAME}.azurewebsites.net`);
      }
      
      console.log('\n🔧 Available Scripts:');
      console.log('   npm run db:migrate - Run database migrations');
      console.log('   npm run db:seed - Seed database with sample data');
      console.log('   npm run dev:full - Run both server and client in development');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();