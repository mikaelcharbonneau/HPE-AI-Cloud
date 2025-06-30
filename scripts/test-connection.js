const { Client } = require('pg');
require('dotenv').config();

console.log('🔍 Environment variables:');
console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
console.log('DATABASE_PORT:', process.env.DATABASE_PORT);
console.log('DATABASE_NAME:', process.env.DATABASE_NAME);
console.log('DATABASE_USER:', process.env.DATABASE_USER);

async function testConnectionString() {
  // Try connection string format
  const connectionString = `postgres://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME}?sslmode=require`;
  
  console.log('\n🔗 Connection String (sanitized):', connectionString.replace(process.env.DATABASE_PASSWORD, '***'));
  
  const client = new Client({
    connectionString: connectionString,
    connectionTimeoutMillis: 20000
  });

  try {
    console.log('\n🔄 Attempting connection string connection...');
    
    client.on('connect', () => console.log('✅ Client connected via connection string!'));
    client.on('error', (err) => console.error('💥 Client error:', err.message));
    client.on('end', () => console.log('🔚 Client disconnected'));

    await client.connect();
    console.log('✅ Connection string connection established!');
    
    const result = await client.query('SELECT NOW(), current_user, version()');
    console.log('⏰ Current time:', result.rows[0].now);
    console.log('👤 Current user:', result.rows[0].current_user);
    console.log('📋 PostgreSQL version:', result.rows[0].version.substring(0, 80));
    
    await client.end();
    console.log('🎉 Connection string test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Connection string test failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
}

async function testConnectionStringNoSSL() {
  // Try connection string without SSL requirement
  const connectionString = `postgres://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME}`;
  
  console.log('\n🔗 Connection String No SSL (sanitized):', connectionString.replace(process.env.DATABASE_PASSWORD, '***'));
  
  const client = new Client({
    connectionString: connectionString,
    connectionTimeoutMillis: 20000
  });

  try {
    console.log('\n🔄 Attempting connection string without SSL...');
    
    await client.connect();
    console.log('✅ No SSL connection established!');
    
    const result = await client.query('SELECT NOW(), current_user');
    console.log('⏰ Current time:', result.rows[0].now);
    console.log('👤 Current user:', result.rows[0].current_user);
    
    await client.end();
    console.log('🎉 No SSL test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('\n❌ No SSL connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Testing Azure PostgreSQL Flexible Server connection...\n');
  
  // Test connection string with SSL
  const sslSuccess = await testConnectionString();
  if (sslSuccess) return;
  
  // Test connection string without SSL
  const noSslSuccess = await testConnectionStringNoSSL();
  if (noSslSuccess) return;
  
  console.log('\n❌ All connection attempts failed.');
  console.log('🔍 This might indicate:');
  console.log('  1. Network connectivity issues from your location');
  console.log('  2. Azure PostgreSQL Flexible Server configuration issue');
  console.log('  3. Authentication or authorization problem');
  console.log('  4. Regional access restrictions');
  console.log('\n💡 Recommendations:');
  console.log('  1. Test from Azure Cloud Shell: https://shell.azure.com');
  console.log('  2. Verify server is running: az postgres flexible-server show');
  console.log('  3. Check server logs if available');
  console.log('  4. Try from a different network location');
}

runTests(); 