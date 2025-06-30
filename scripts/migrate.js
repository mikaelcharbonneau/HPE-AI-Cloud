const { pool, testConnection } = require('../src/config/database');
require('dotenv').config();

const migrations = [
  {
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `
  },
  {
    name: 'create_audits_table',
    sql: `
      CREATE TABLE IF NOT EXISTS audits (
        id UUID PRIMARY KEY,
        technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        datacenter VARCHAR(100) NOT NULL,
        data_hall VARCHAR(100) NOT NULL,
        walkthrough_id VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'deleted')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_audits_technician ON audits(technician_id);
      CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
      CREATE INDEX IF NOT EXISTS idx_audits_datacenter ON audits(datacenter);
      CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at);
    `
  },
  {
    name: 'create_issues_table',
    sql: `
      CREATE TABLE IF NOT EXISTS issues (
        id UUID PRIMARY KEY,
        audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
        rack_location VARCHAR(100),
        device_type VARCHAR(50) CHECK (device_type IN ('power_supply_unit', 'power_distribution_unit', 'rear_door_heat_exchanger')),
        device_details JSONB,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
        psu_id VARCHAR(100),
        u_height VARCHAR(20),
        severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'healthy')),
        comments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_issues_audit ON issues(audit_id);
      CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
      CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
      CREATE INDEX IF NOT EXISTS idx_issues_device_type ON issues(device_type);
      CREATE INDEX IF NOT EXISTS idx_issues_created ON issues(created_at);
    `
  },
  {
    name: 'create_reports_table',
    sql: `
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        parameters JSONB,
        generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        file_path VARCHAR(500),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );

      CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
    `
  },
  {
    name: 'create_audit_logs_table',
    sql: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    `
  }
];

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  // Test database connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot connect to database. Please check your configuration.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get executed migrations
    const executedResult = await client.query('SELECT name FROM migrations');
    const executedMigrations = executedResult.rows.map(row => row.name);

    // Run pending migrations
    for (const migration of migrations) {
      if (executedMigrations.includes(migration.name)) {
        console.log(`⏭️  Skipping migration: ${migration.name} (already executed)`);
        continue;
      }

      console.log(`📦 Running migration: ${migration.name}`);
      
      try {
        // Start transaction
        await client.query('BEGIN');
        
        // Execute migration
        await client.query(migration.sql);
        
        // Record migration
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migration.name]
        );
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ Migration completed: ${migration.name}`);
      } catch (error) {
        // Rollback transaction
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('\n🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations }; 