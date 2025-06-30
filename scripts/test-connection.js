const { Pool } = require('pg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
require('dotenv').config();

console.log('🔍 Environment variables:');
console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
console.log('DATABASE_PORT:', process.env.DATABASE_PORT);
console.log('DATABASE_NAME:', process.env.DATABASE_NAME);
console.log('DATABASE_USER:', process.env.DATABASE_USER);
console.log('AZURE_AD_AUTH:', process.env.AZURE_AD_AUTH);

// Function to get Azure AD access token
async function getAzureADToken() {
  try {
    if (process.env.AZURE_AD_AUTH === 'true') {
      console.log('🔐 Getting Azure AD access token...');
      const { stdout } = await execAsync(
        'az account get-access-token --resource https://ossrdbms-aad.database.windows.net --query accessToken --output tsv'
      );
      const token = stdout.trim();
      console.log('✅ Azure AD token obtained, length:', token.length);
      return token;
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to get Azure AD token:', error.message);
    return null;
  }
}

// Database configuration for Flexible Server
async function getDatabaseConfig() {
  const dbConfig = {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    connectionTimeoutMillis: 30000, // Reduced timeout for faster feedback
    query_timeout: 30000,
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000,
    // Try minimal SSL config first
    ssl: true
  };

  // Get Azure AD token if using Azure AD auth
  if (process.env.AZURE_AD_AUTH === 'true') {
    const token = await getAzureADToken();
    if (token) {
      dbConfig.password = token;
      console.log('🔑 Using Azure AD token as password');
      
      // Additional settings for Azure AD with Flexible Server
      dbConfig.application_name = 'NodeJS-Test-Connection';
    } else {
      console.error('❌ Failed to get Azure AD token, connection will likely fail');
    }
  } else {
    console.log('🔑 Using standard password authentication');
  }

  return dbConfig;
}

console.log('🔌 Testing database connection to Azure PostgreSQL Flexible Server...');

async function testConnection() {
  let pool;
  try {
    const dbConfig = await getDatabaseConfig();
    
    console.log('\n📋 Connection config:');
    console.log('Host:', dbConfig.host);
    console.log('Port:', dbConfig.port);
    console.log('Database:', dbConfig.database);
    console.log('User:', dbConfig.user);
    console.log('Password length:', dbConfig.password ? dbConfig.password.length : 'undefined');
    console.log('SSL enabled:', !!dbConfig.ssl);
    console.log('Connection timeout:', dbConfig.connectionTimeoutMillis + 'ms');

    pool = new Pool(dbConfig);
    
    // Add error handler for pool
    pool.on('error', (err) => {
      console.error('💥 Pool error:', err.message);
    });
    
    console.log('\n🔄 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully!');
    
    // Test a simple query
    console.log('\n🔍 Testing queries...');
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version, current_user as connected_user');
    console.log('⏰ Database time:', result.rows[0].current_time);
    console.log('👤 Connected as user:', result.rows[0].connected_user);
    console.log('🐘 PostgreSQL version:', result.rows[0].postgres_version.substring(0, 80) + '...');
    
    // Test if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Existing tables:', tablesResult.rows.map(row => row.table_name));
    
    // Test Azure AD specific query if using Azure AD
    if (process.env.AZURE_AD_AUTH === 'true') {
      try {
        const authResult = await client.query('SELECT current_setting(\'is_superuser\') as is_superuser, session_user as session_user');
        console.log('🔐 Auth info - Is superuser:', authResult.rows[0].is_superuser);
        console.log('🔐 Auth info - Session user:', authResult.rows[0].session_user);
      } catch (authErr) {
        console.log('⚠️ Could not get auth info:', authErr.message);
      }
    }
    
    client.release();
    
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 This usually means the hostname is incorrect');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔍 This usually means the port is incorrect or firewall is blocking');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔍 This usually means firewall blocking or network issues');
      console.error('💡 Check Azure PostgreSQL firewall rules');
    } else if (error.code === '28P01') {
      console.error('🔍 This usually means incorrect username/password');
      console.error('💡 For Azure AD: Make sure user is added as Azure AD administrator');
    } else if (error.code === '3D000') {
      console.error('🔍 This usually means the database name is incorrect');
    } else if (error.code === '28000') {
      console.error('🔍 This usually means authentication failed - check Azure AD token and admin setup');
    } else if (error.message.includes('timeout')) {
      console.error('�� Connection timeout - this could be:');
      console.error('  - Firewall blocking the connection');
      console.error('  - Azure AD authentication not properly configured');
      console.error('  - User not added as Azure AD administrator');
    }
    
    console.error('\n🛠️ Full error details:', error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

testConnection(); 