const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const authConfig = require('../config/auth');

class User {
  /**
   * Create a new user
   */
  static async create({ email, password, firstName, lastName }) {
    const client = await pool.connect();
    
    try {
      // Hash password
      const saltRounds = authConfig.bcrypt.saltRounds;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const query = `
        INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, email, first_name, last_name, created_at
      `;
      
      const result = await client.query(query, [email, hashedPassword, firstName, lastName]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, email, password_hash, first_name, last_name, 
               is_active, created_at, updated_at, last_login
        FROM users 
        WHERE email = $1
      `;
      
      const result = await client.query(query, [email]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, email, first_name, last_name, 
               is_active, created_at, updated_at, last_login
        FROM users 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId) {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(query, [userId]);
    } finally {
      client.release();
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  static async findAll(limit = 50, offset = 0) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT id, email, first_name, last_name, 
               is_active, created_at, last_login
        FROM users 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const result = await client.query(query, [limit, offset]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, { firstName, lastName }) {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET first_name = $2, last_name = $3, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, first_name, last_name, updated_at
      `;
      
      const result = await client.query(query, [userId, firstName, lastName]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Deactivate user
   */
  static async deactivate(userId) {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE users 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, is_active
      `;
      
      const result = await client.query(query, [userId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Check if email exists
   */
  static async emailExists(email) {
    const client = await pool.connect();
    
    try {
      const query = 'SELECT id FROM users WHERE email = $1';
      const result = await client.query(query, [email]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }
}

module.exports = User; 