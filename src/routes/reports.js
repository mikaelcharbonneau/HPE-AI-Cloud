const express = require('express');
const { query, validationResult } = require('express-validator');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs').promises;
const Issue = require('../models/Issue');
const Audit = require('../models/Audit');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/reports/generate
 * @desc Generate a CSV report of issues
 * @access Private
 */
router.get('/generate', [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('datacenter')
    .optional()
    .trim(),
  query('dataHall')
    .optional()
    .trim(),
  query('severity')
    .optional()
    .isIn(['critical', 'warning', 'healthy'])
    .withMessage('Severity must be critical, warning, or healthy'),
  query('status')
    .optional()
    .isIn(['open', 'resolved', 'closed'])
    .withMessage('Status must be open, resolved, or closed')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      datacenter: req.query.datacenter,
      dataHall: req.query.dataHall,
      severity: req.query.severity,
      status: req.query.status,
      limit: 10000 // Large limit for reports
    };

    // Get issues based on filters
    const issues = await Issue.findAll(filters);

    if (issues.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No data found for the specified criteria'
      });
    }

    // Create CSV filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `datacenter-audit-report-${timestamp}.csv`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, filename);

    // Ensure uploads directory exists
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Define CSV headers
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'datacenter', title: 'Datacenter' },
        { id: 'dataHall', title: 'Data Hall' },
        { id: 'walkthroughId', title: 'Walkthrough ID' },
        { id: 'rackLocation', title: 'Rack Location' },
        { id: 'deviceType', title: 'Device Type' },
        { id: 'psuId', title: 'PSU ID' },
        { id: 'uHeight', title: 'U-Height' },
        { id: 'severity', title: 'Severity' },
        { id: 'status', title: 'Status' },
        { id: 'comments', title: 'Comments' },
        { id: 'technician', title: 'Technician' },
        { id: 'createdAt', title: 'Created Date' },
        { id: 'resolvedAt', title: 'Resolved Date' }
      ]
    });

    // Transform data for CSV
    const csvData = issues.map(issue => ({
      datacenter: issue.datacenter || '',
      dataHall: issue.data_hall || '',
      walkthroughId: issue.walkthrough_id || '',
      rackLocation: issue.rack_location || '',
      deviceType: issue.device_type ? issue.device_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '',
      psuId: issue.psu_id || '',
      uHeight: issue.u_height || '',
      severity: issue.severity ? issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1) : '',
      status: issue.status ? issue.status.charAt(0).toUpperCase() + issue.status.slice(1) : '',
      comments: issue.comments || '',
      technician: issue.first_name && issue.last_name ? `${issue.first_name} ${issue.last_name}` : '',
      createdAt: issue.created_at ? new Date(issue.created_at).toLocaleString() : '',
      resolvedAt: issue.resolved_at ? new Date(issue.resolved_at).toLocaleString() : ''
    }));

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = await fs.readFile(filePath);
    res.send(fileStream);

    // Clean up - delete file after sending (optional)
    setTimeout(async () => {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.error('Error deleting temp file:', error);
      }
    }, 5000);

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * @route GET /api/reports/summary
 * @desc Get report summary data
 * @access Private
 */
router.get('/summary', [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('datacenter')
    .optional()
    .trim()
], async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      datacenter: req.query.datacenter
    };

    const [auditStats, issueStats] = await Promise.all([
      Audit.getStatistics(filters),
      Issue.getStatistics(filters)
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalAudits: parseInt(auditStats.total_audits) || 0,
          completedAudits: parseInt(auditStats.completed_audits) || 0,
          totalIssues: parseInt(issueStats.total_issues) || 0,
          criticalIssues: parseInt(issueStats.critical_issues) || 0,
          warningIssues: parseInt(issueStats.warning_issues) || 0,
          healthyIssues: parseInt(issueStats.healthy_issues) || 0,
          openIssues: parseInt(issueStats.open_issues) || 0,
          resolvedIssues: parseInt(issueStats.resolved_issues) || 0
        }
      }
    });

  } catch (error) {
    console.error('Report summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report summary'
    });
  }
});

module.exports = router; 