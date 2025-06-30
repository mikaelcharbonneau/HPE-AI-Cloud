const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'datacenter_audit_tool',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to try connecting before timing out
};

// Function to get Azure AD access token
async function getAzureADToken() {
  try {
    if (process.env.AZURE_AD_AUTH === 'true') {
      console.log('🔐 Getting Azure AD access token...');
      const { stdout } = await execAsync(
        'az account get-access-token --resource https://ossrdbms-aad.database.windows.net --query accessToken --output tsv'
      );
      return stdout.trim();
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Failed to get Azure AD token, falling back to regular auth:', error.message);
    return null;
  }
}

// Use DATABASE_URL if provided (for production environments like Azure)
if (process.env.DATABASE_URL) {
  dbConfig.connectionString = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production') {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
  }
} else if (process.env.AZURE_AD_AUTH === 'true') {
  // Configure for Azure AD authentication
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

// Create connection pool with Azure AD token refresh
let pool;

async function createPool() {
  if (process.env.AZURE_AD_AUTH === 'true' && !process.env.DATABASE_URL) {
    // Get fresh token for Azure AD auth
    const token = await getAzureADToken();
    if (token) {
      dbConfig.password = token;
    }
  }
  
  return new Pool(dbConfig);
}

// Initialize pool
async function initializePool() {
  pool = await createPool();
  
  // Handle pool errors
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit immediately, try to reconnect
    setTimeout(async () => {
      try {
        await pool.end();
        pool = await createPool();
        console.log('✅ Database pool recreated');
      } catch (error) {
        console.error('❌ Failed to recreate pool:', error);
        process.exit(-1);
      }
    }, 1000);
  });
  
  // Refresh Azure AD token every 50 minutes (tokens expire after 1 hour)
  if (process.env.AZURE_AD_AUTH === 'true') {
    setInterval(async () => {
      try {
        console.log('🔄 Refreshing Azure AD token...');
        await pool.end();
        pool = await createPool();
        console.log('✅ Azure AD token refreshed');
      } catch (error) {
        console.error('❌ Failed to refresh Azure AD token:', error);
      }
    }, 50 * 60 * 1000); // 50 minutes
  }
}

// Test database connection
const testConnection = async () => {
  try {
    if (!pool) {
      await initializePool();
    }
    
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    const result = await client.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    
    // If it's an auth error with Azure AD, try to refresh token
    if (process.env.AZURE_AD_AUTH === 'true' && err.message.includes('authentication')) {
      console.log('🔄 Attempting to refresh Azure AD token...');
      try {
        pool = await createPool();
        const client = await pool.connect();
        console.log('✅ Database connected after token refresh');
        client.release();
        return true;
      } catch (refreshErr) {
        console.error('❌ Failed to connect after token refresh:', refreshErr.message);
      }
    }
    
    return false;
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    if (pool) {
      await pool.end();
      console.log('Database pool closed');
    }
  } catch (err) {
    console.error('Error closing database pool:', err);
  }
};

// Export pool as a getter to ensure it's initialized
const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call testConnection() first.');
  }
  return pool;
};

module.exports = {
  get pool() { return getPool(); },
  testConnection,
  closePool,
  initializePool
}; 