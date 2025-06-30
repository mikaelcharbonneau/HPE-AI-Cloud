const { pool, testConnection } = require('../src/config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedData = {
  users: [
    {
      email: 'admin@hpe.com',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User'
    },
    {
      email: 'mikael.charbonneau@hpe.com',
      password: 'Mikael123!',
      firstName: 'Mikael',
      lastName: 'Charbonneau'
    },
    {
      email: 'mohsen.bouska@hpe.com',
      password: 'Mohsen123!',
      firstName: 'Mohsen',
      lastName: 'Bouska'
    },
    {
      email: 'clifford.chimezie@hpe.com',
      password: 'Clifford123!',
      firstName: 'Clifford',
      lastName: 'Chimezie'
    },
    {
      email: 'leena.saini@hpe.com',
      password: 'Leena123!',
      firstName: 'Leena',
      lastName: 'Saini'
    }
  ],
  datacenters: [
    {
      name: 'Canada - Quebec',
      dataHalls: ['Island 1', 'Island 8', 'Island 9', 'Island 10', 'Island 11', 'Island 12', 'Green Nitrogen']
    },
    {
      name: 'Norway - Enebakk',
      dataHalls: ['Hall A', 'Hall B', 'Hall C']
    },
    {
      name: 'Norway - Rjukan',
      dataHalls: ['Hall 1', 'Hall 2', 'Hall 3']
    },
    {
      name: 'United States - Dallas',
      dataHalls: ['East Wing', 'West Wing', 'Central Hub']
    },
    {
      name: 'United States - Houston',
      dataHalls: ['North Building', 'South Building', 'Storage Facility']
    }
  ]
};

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  // Test database connection first
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot connect to database. Please check your configuration.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if data already exists
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('⚠️  Database already contains data. Skipping seed.');
      await client.query('ROLLBACK');
      return;
    }

    console.log('👥 Seeding users...');
    const userIds = [];
    
    for (const user of seedData.users) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      const result = await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [user.email, hashedPassword, user.firstName, user.lastName]);
      
      userIds.push(result.rows[0].id);
      console.log(`   ✅ Created user: ${user.email}`);
    }

    console.log('\n🏢 Seeding sample audits...');
    
    // Create some sample audits
    const sampleAudits = [
      {
        technicianId: userIds[1], // Mikael
        datacenter: 'Canada - Quebec',
        dataHall: 'Island 1',
        walkthroughId: '#16',
        status: 'completed',
        issuesCount: 1
      },
      {
        technicianId: userIds[2], // Mohsen
        datacenter: 'Canada - Quebec',
        dataHall: 'Island 8',
        walkthroughId: '#4',
        status: 'completed',
        issuesCount: 28
      },
      {
        technicianId: userIds[3], // Clifford
        datacenter: 'Canada - Quebec',
        dataHall: 'Island 1',
        walkthroughId: '#3',
        status: 'completed',
        issuesCount: 18
      },
      {
        technicianId: userIds[4], // Leena
        datacenter: 'Canada - Quebec',
        dataHall: 'Island 9',
        walkthroughId: '#1',
        status: 'completed',
        issuesCount: 17
      },
      {
        technicianId: userIds[1], // Mikael
        datacenter: 'Canada - Quebec',
        dataHall: 'Island 10',
        walkthroughId: '#4',
        status: 'completed',
        issuesCount: 69
      }
    ];

    const auditIds = [];
    for (const audit of sampleAudits) {
      const auditId = require('uuid').v4();
      
      await client.query(`
        INSERT INTO audits (id, technician_id, datacenter, data_hall, walkthrough_id, status, created_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days', NOW() - INTERVAL '${Math.floor(Math.random() * 29)} days')
      `, [auditId, audit.technicianId, audit.datacenter, audit.dataHall, audit.walkthroughId, audit.status]);
      
      auditIds.push({ id: auditId, issuesCount: audit.issuesCount });
      console.log(`   ✅ Created audit: ${audit.datacenter} - ${audit.dataHall} (${audit.walkthroughId})`);
    }

    console.log('\n🚨 Seeding sample issues...');
    
    // Create sample issues for each audit
    for (const audit of auditIds) {
      for (let i = 0; i < audit.issuesCount; i++) {
        const issueId = require('uuid').v4();
        const severities = ['critical', 'warning', 'healthy'];
        const deviceTypes = ['power_supply_unit', 'power_distribution_unit', 'rear_door_heat_exchanger'];
        const statuses = ['open', 'resolved'];
        
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const status = Math.random() > 0.3 ? 'open' : 'resolved'; // 70% open, 30% resolved
        
        await client.query(`
          INSERT INTO issues (
            id, audit_id, rack_location, device_type, status, 
            severity, comments, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')
        `, [
          issueId,
          audit.id,
          `X${Math.floor(Math.random() * 50) + 1}${String.fromCharCode(65 + Math.floor(Math.random() * 10))}${Math.floor(Math.random() * 10)}`,
          deviceType,
          status,
          severity,
          'Sample issue created during seeding process'
        ]);
      }
    }

    // Create one active audit for demonstration
    console.log('\n🔄 Creating active audit for demonstration...');
    const activeAuditId = require('uuid').v4();
    await client.query(`
      INSERT INTO audits (id, technician_id, datacenter, data_hall, walkthrough_id, status)
      VALUES ($1, $2, 'Canada - Quebec', 'Island 1', '#16', 'active')
    `, [activeAuditId, userIds[1]]);

    console.log('   ✅ Created active audit for testing');

    await client.query('COMMIT');
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Seeded data summary:');
    console.log(`   👥 Users: ${seedData.users.length}`);
    console.log(`   🏢 Datacenters: ${seedData.datacenters.length}`);
    console.log(`   📊 Audits: ${sampleAudits.length + 1} (including 1 active)`);
    console.log(`   🚨 Issues: ${auditIds.reduce((sum, audit) => sum + audit.issuesCount, 0)}`);
    
    console.log('\n🔑 Login credentials:');
    seedData.users.forEach(user => {
      console.log(`   ${user.email} / ${user.password}`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase }; 