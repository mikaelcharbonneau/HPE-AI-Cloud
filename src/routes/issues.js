const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Issue = require('../models/Issue');
const Audit = require('../models/Audit');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/issues
 * @desc Create a new issue
 * @access Private
 */
router.post('/', [
  body('auditId')
    .notEmpty()
    .withMessage('Audit ID is required'),
  body('rackLocation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Rack location must be less than 100 characters'),
  body('deviceType')
    .isIn(['power_supply_unit', 'power_distribution_unit', 'rear_door_heat_exchanger'])
    .withMessage('Device type must be power_supply_unit, power_distribution_unit, or rear_door_heat_exchanger'),
  body('severity')
    .isIn(['critical', 'warning', 'healthy'])
    .withMessage('Severity must be critical, warning, or healthy'),
  body('status')
    .optional()
    .isIn(['open', 'resolved', 'closed'])
    .withMessage('Status must be open, resolved, or closed'),
  body('psuId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('PSU ID must be less than 100 characters'),
  body('uHeight')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('U-Height must be less than 20 characters'),
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments must be less than 1000 characters')
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

    const {
      auditId,
      rackLocation,
      deviceType,
      deviceDetails,
      status = 'open',
      psuId,
      uHeight,
      severity,
      comments
    } = req.body;

    // Verify that the audit exists and belongs to the user
    const audit = await Audit.findById(auditId);
    if (!audit) {
      return res.status(404).json({
        success: false,
        error: 'Audit not found'
      });
    }

    if (audit.technician_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only create issues for your own audits'
      });
    }

    if (audit.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot add issues to inactive audits'
      });
    }

    const issue = await Issue.create({
      auditId,
      rackLocation,
      deviceType,
      deviceDetails,
      status,
      psuId,
      uHeight,
      severity,
      comments
    });

    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: { issue }
    });

  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create issue'
    });
  }
});

/**
 * @route GET /api/issues
 * @desc Get all issues with optional filtering
 * @access Private
 */
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('auditId')
    .optional()
    .trim(),
  query('severity')
    .optional()
    .isIn(['critical', 'warning', 'healthy'])
    .withMessage('Severity must be critical, warning, or healthy'),
  query('status')
    .optional()
    .isIn(['open', 'resolved', 'closed'])
    .withMessage('Status must be open, resolved, or closed'),
  query('deviceType')
    .optional()
    .isIn(['power_supply_unit', 'power_distribution_unit', 'rear_door_heat_exchanger'])
    .withMessage('Device type must be power_supply_unit, power_distribution_unit, or rear_door_heat_exchanger'),
  query('datacenter')
    .optional()
    .trim(),
  query('dataHall')
    .optional()
    .trim(),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const filters = {
      limit,
      offset,
      auditId: req.query.auditId,
      severity: req.query.severity,
      status: req.query.status,
      deviceType: req.query.deviceType,
      datacenter: req.query.datacenter,
      dataHall: req.query.dataHall,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const issues = await Issue.findAll(filters);

    res.json({
      success: true,
      data: {
        issues,
        pagination: {
          page,
          limit,
          hasMore: issues.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issues'
    });
  }
});

/**
 * @route GET /api/issues/:id
 * @desc Get issue by ID
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    res.json({
      success: true,
      data: { issue }
    });

  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue'
    });
  }
});

/**
 * @route PUT /api/issues/:id
 * @desc Update an issue
 * @access Private
 */
router.put('/:id', [
  body('rackLocation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Rack location must be less than 100 characters'),
  body('deviceType')
    .optional()
    .isIn(['power_supply_unit', 'power_distribution_unit', 'rear_door_heat_exchanger'])
    .withMessage('Device type must be power_supply_unit, power_distribution_unit, or rear_door_heat_exchanger'),
  body('severity')
    .optional()
    .isIn(['critical', 'warning', 'healthy'])
    .withMessage('Severity must be critical, warning, or healthy'),
  body('status')
    .optional()
    .isIn(['open', 'resolved', 'closed'])
    .withMessage('Status must be open, resolved, or closed'),
  body('psuId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('PSU ID must be less than 100 characters'),
  body('uHeight')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('U-Height must be less than 20 characters'),
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comments must be less than 1000 characters')
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

    const { id } = req.params;
    const updateData = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    const updatedIssue = await Issue.update(id, updateData);

    res.json({
      success: true,
      message: 'Issue updated successfully',
      data: { issue: updatedIssue }
    });

  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update issue'
    });
  }
});

/**
 * @route POST /api/issues/:id/resolve
 * @desc Resolve an issue
 * @access Private
 */
router.post('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    if (issue.status === 'resolved') {
      return res.status(400).json({
        success: false,
        error: 'Issue is already resolved'
      });
    }

    const resolvedIssue = await Issue.resolve(id);

    res.json({
      success: true,
      message: 'Issue resolved successfully',
      data: { issue: resolvedIssue }
    });

  } catch (error) {
    console.error('Resolve issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve issue'
    });
  }
});

/**
 * @route POST /api/issues/:id/reopen
 * @desc Reopen a resolved issue
 * @access Private
 */
router.post('/:id/reopen', async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    if (issue.status === 'open') {
      return res.status(400).json({
        success: false,
        error: 'Issue is already open'
      });
    }

    const reopenedIssue = await Issue.reopen(id);

    res.json({
      success: true,
      message: 'Issue reopened successfully',
      data: { issue: reopenedIssue }
    });

  } catch (error) {
    console.error('Reopen issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reopen issue'
    });
  }
});

/**
 * @route DELETE /api/issues/:id
 * @desc Delete an issue
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        error: 'Issue not found'
      });
    }

    const deletedIssue = await Issue.delete(id);

    res.json({
      success: true,
      message: 'Issue deleted successfully',
      data: { issue: deletedIssue }
    });

  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete issue'
    });
  }
});

/**
 * @route GET /api/issues/stats/overview
 * @desc Get issue statistics
 * @access Private
 */
router.get('/stats/overview', [
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
      datacenter: req.query.datacenter
    };

    const stats = await Issue.getStatistics(filters);

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get issue stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue statistics'
    });
  }
});

module.exports = router; 