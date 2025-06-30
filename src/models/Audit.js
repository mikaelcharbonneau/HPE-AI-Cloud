const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Audit {
  /**
   * Create a new audit
   */
  static async create({ technicianId, datacenter, dataHall, walkthroughId }) {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO audits (
          id, technician_id, datacenter, data_hall, walkthrough_id, 
          status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
        RETURNING *
      `;
      
      const auditId = uuidv4();
      const result = await client.query(query, [
        auditId, technicianId, datacenter, dataHall, walkthroughId
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Find audit by ID
   */
  static async findById(id) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT a.*, u.first_name, u.last_name, u.email as technician_email,
               COUNT(i.id) as issues_count
        FROM audits a
        LEFT JOIN users u ON a.technician_id = u.id
        LEFT JOIN issues i ON a.id = i.audit_id
        WHERE a.id = $1
        GROUP BY a.id, u.id
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get all audits with pagination and filters
   */
  static async findAll({ 
    limit = 50, 
    offset = 0, 
    datacenter = null, 
    dataHall = null, 
    status = null,
    technicianId = null,
    startDate = null,
    endDate = null
  }) {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT a.*, u.first_name, u.last_name, u.email as technician_email,
               COUNT(i.id) as issues_count
        FROM audits a
        LEFT JOIN users u ON a.technician_id = u.id
        LEFT JOIN issues i ON a.id = i.audit_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (datacenter) {
        query += ` AND a.datacenter = $${paramIndex}`;
        params.push(datacenter);
        paramIndex++;
      }

      if (dataHall) {
        query += ` AND a.data_hall = $${paramIndex}`;
        params.push(dataHall);
        paramIndex++;
      }

      if (status) {
        query += ` AND a.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (technicianId) {
        query += ` AND a.technician_id = $${paramIndex}`;
        params.push(technicianId);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND a.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND a.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += `
        GROUP BY a.id, u.id
        ORDER BY a.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(limit, offset);
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Update audit status
   */
  static async updateStatus(id, status) {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE audits 
        SET status = $2, 
            completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, [id, status]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Complete audit
   */
  static async complete(id) {
    return await this.updateStatus(id, 'completed');
  }

  /**
   * Cancel audit
   */
  static async cancel(id) {
    return await this.updateStatus(id, 'cancelled');
  }

  /**
   * Get audit statistics
   */
  static async getStatistics(filters = {}) {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          COUNT(*) as total_audits,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_audits,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_audits,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_audits
        FROM audits
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (filters.startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      if (filters.datacenter) {
        query += ` AND datacenter = $${paramIndex}`;
        params.push(filters.datacenter);
        paramIndex++;
      }
      
      const result = await client.query(query, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get recent audits for dashboard
   */
  static async getRecent(limit = 5) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT a.*, u.first_name, u.last_name,
               COUNT(i.id) as issues_count
        FROM audits a
        LEFT JOIN users u ON a.technician_id = u.id
        LEFT JOIN issues i ON a.id = i.audit_id
        GROUP BY a.id, u.id
        ORDER BY a.created_at DESC
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Delete audit (soft delete by updating status)
   */
  static async delete(id) {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE audits 
        SET status = 'deleted', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = Audit; 