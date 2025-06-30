const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Issue {
  /**
   * Create a new issue
   */
  static async create({
    auditId,
    rackLocation,
    deviceType,
    deviceDetails,
    status,
    psuId,
    uHeight,
    severity,
    comments
  }) {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO issues (
          id, audit_id, rack_location, device_type, device_details,
          status, psu_id, u_height, severity, comments, 
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;
      
      const issueId = uuidv4();
      const result = await client.query(query, [
        issueId, auditId, rackLocation, deviceType, deviceDetails,
        status, psuId, uHeight, severity, comments
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Find issue by ID
   */
  static async findById(id) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT i.*, a.datacenter, a.data_hall, a.walkthrough_id,
               u.first_name, u.last_name, u.email as technician_email
        FROM issues i
        LEFT JOIN audits a ON i.audit_id = a.id
        LEFT JOIN users u ON a.technician_id = u.id
        WHERE i.id = $1
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  /**
   * Get all issues with pagination and filters
   */
  static async findAll({
    limit = 50,
    offset = 0,
    auditId = null,
    severity = null,
    status = null,
    deviceType = null,
    datacenter = null,
    dataHall = null,
    startDate = null,
    endDate = null
  }) {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT i.*, a.datacenter, a.data_hall, a.walkthrough_id,
               u.first_name, u.last_name, u.email as technician_email
        FROM issues i
        LEFT JOIN audits a ON i.audit_id = a.id
        LEFT JOIN users u ON a.technician_id = u.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (auditId) {
        query += ` AND i.audit_id = $${paramIndex}`;
        params.push(auditId);
        paramIndex++;
      }

      if (severity) {
        query += ` AND i.severity = $${paramIndex}`;
        params.push(severity);
        paramIndex++;
      }

      if (status) {
        query += ` AND i.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (deviceType) {
        query += ` AND i.device_type = $${paramIndex}`;
        params.push(deviceType);
        paramIndex++;
      }

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

      if (startDate) {
        query += ` AND i.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND i.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += `
        ORDER BY i.created_at DESC
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
   * Update issue status
   */
  static async updateStatus(id, status) {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE issues 
        SET status = $2, 
            resolved_at = CASE WHEN $2 = 'resolved' THEN NOW() ELSE resolved_at END,
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
   * Update issue details
   */
  static async update(id, updateData) {
    const client = await pool.connect();
    
    try {
      const {
        rackLocation,
        deviceType,
        deviceDetails,
        status,
        psuId,
        uHeight,
        severity,
        comments
      } = updateData;

      const query = `
        UPDATE issues 
        SET rack_location = COALESCE($2, rack_location),
            device_type = COALESCE($3, device_type),
            device_details = COALESCE($4, device_details),
            status = COALESCE($5, status),
            psu_id = COALESCE($6, psu_id),
            u_height = COALESCE($7, u_height),
            severity = COALESCE($8, severity),
            comments = COALESCE($9, comments),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, [
        id, rackLocation, deviceType, deviceDetails,
        status, psuId, uHeight, severity, comments
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get issue statistics
   */
  static async getStatistics(filters = {}) {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          COUNT(*) as total_issues,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_issues,
          COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_issues,
          COUNT(CASE WHEN severity = 'healthy' THEN 1 END) as healthy_issues,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_issues,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_issues
        FROM issues i
        LEFT JOIN audits a ON i.audit_id = a.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (filters.startDate) {
        query += ` AND i.created_at >= $${paramIndex}`;
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        query += ` AND i.created_at <= $${paramIndex}`;
        params.push(filters.endDate);
        paramIndex++;
      }

      if (filters.datacenter) {
        query += ` AND a.datacenter = $${paramIndex}`;
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
   * Get active incidents (open critical issues)
   */
  static async getActiveIncidents() {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT i.*, a.datacenter, a.data_hall, a.walkthrough_id,
               u.first_name, u.last_name
        FROM issues i
        LEFT JOIN audits a ON i.audit_id = a.id
        LEFT JOIN users u ON a.technician_id = u.id
        WHERE i.status = 'open' AND i.severity = 'critical'
        ORDER BY i.created_at DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Resolve issue
   */
  static async resolve(id) {
    return await this.updateStatus(id, 'resolved');
  }

  /**
   * Reopen issue
   */
  static async reopen(id) {
    return await this.updateStatus(id, 'open');
  }

  /**
   * Delete issue
   */
  static async delete(id) {
    const client = await pool.connect();
    
    try {
      const query = 'DELETE FROM issues WHERE id = $1 RETURNING *';
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Get issues by audit ID
   */
  static async findByAuditId(auditId) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM issues 
        WHERE audit_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await client.query(query, [auditId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get issues count by severity
   */
  static async getCountBySeverity() {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT severity, COUNT(*) as count
        FROM issues 
        WHERE status = 'open'
        GROUP BY severity
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = Issue; 