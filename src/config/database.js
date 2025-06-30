const { Pool } = require('pg');
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

// Use DATABASE_URL if provided (for production environments like Azure)
if (process.env.DATABASE_URL) {
  dbConfig.connectionString = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production') {
    dbConfig.ssl = {
      rejectUnauthorized: false
    };
  }
}

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    const result = await client.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (err) {
    console.error('Error closing database pool:', err);
  }
};

module.exports = {
  pool,
  testConnection,
  closePool
}; 