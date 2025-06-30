const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'datacenter_audit_tool',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
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

const pool = new Pool(dbConfig);

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'technician',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Audits table
  `CREATE TABLE IF NOT EXISTS audits (
    id SERIAL PRIMARY KEY,
    datacenter VARCHAR(255) NOT NULL,
    data_hall VARCHAR(255) NOT NULL,
    walkthrough_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    technician_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    notes TEXT
  );`,

  // Issues table
  `CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER REFERENCES audits(id) ON DELETE CASCADE,
    device_type VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    rack_location VARCHAR(100) NOT NULL,
    u_height INTEGER,
    device_details JSONB,
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'warning',
    status VARCHAR(50) DEFAULT 'open',
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,

  // Incidents table (critical issues that require immediate attention)
  `CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER REFERENCES audits(id),
    device_type VARCHAR(100) NOT NULL,
    device_id VARCHAR(100),
    rack_location VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'critical',
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    datacenter VARCHAR(255) NOT NULL,
    data_hall VARCHAR(255) NOT NULL
  );`,

  // Create indexes for better performance
  `CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);`,
  `CREATE INDEX IF NOT EXISTS idx_audits_technician ON audits(technician_id);`,
  `CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_issues_audit_id ON issues(audit_id);`,
  `CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);`,
  `CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);`,
  `CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);`,
  `CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);`,

  // Create updated_at trigger function
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  END;
  $$ language 'plpgsql';`,

  // Create triggers for updated_at
  `CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,

  // Create views for reporting
  `CREATE OR REPLACE VIEW audit_summary AS
  SELECT 
    a.id,
    a.datacenter,
    a.data_hall,
    a.walkthrough_id,
    a.status,
    a.created_at,
    a.completed_at,
    u.first_name,
    u.last_name,
    COUNT(i.id) as issues_count,
    COUNT(CASE WHEN i.severity = 'critical' THEN 1 END) as critical_issues,
    COUNT(CASE WHEN i.severity = 'warning' THEN 1 END) as warning_issues,
    COUNT(CASE WHEN i.severity = 'healthy' THEN 1 END) as healthy_issues
  FROM audits a
  LEFT JOIN users u ON a.technician_id = u.id
  LEFT JOIN issues i ON a.id = i.audit_id
  GROUP BY a.id, u.first_name, u.last_name;`
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    // Run each migration
    for (let i = 0; i < migrations.length; i++) {
      console.log(`Running migration ${i + 1}/${migrations.length}...`);
      await client.query(migrations[i]);
    }
    
    console.log('✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations }; 