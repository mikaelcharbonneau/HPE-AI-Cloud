const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Audit = require('../models/Audit');
const Issue = require('../models/Issue');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/audits
 * @desc Create a new audit
 * @access Private
 */
router.post('/', [
  body('datacenter')
    .trim()
    .notEmpty()
    .withMessage('Datacenter is required'),
  body('dataHall')
    .trim()
    .notEmpty()
    .withMessage('Data hall is required'),
  body('walkthroughId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Walkthrough ID must be less than 50 characters')
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

    const { datacenter, dataHall, walkthroughId } = req.body;

    const audit = await Audit.create({
      technicianId: req.user.id,
      datacenter,
      dataHall,
      walkthroughId
    });

    res.status(201).json({
      success: true,
      message: 'Audit created successfully',
      data: { audit }
    });

  } catch (error) {
    console.error('Create audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create audit'
    });
  }
});

/**
 * @route GET /api/audits
 * @desc Get all audits with optional filtering
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
  query('datacenter')
    .optional()
    .trim(),
  query('dataHall')
    .optional()
    .trim(),
  query('status')
    .optional()
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Status must be active, completed, or cancelled'),
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
      datacenter: req.query.datacenter,
      dataHall: req.query.dataHall,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const audits = await Audit.findAll(filters);

    res.json({
      success: true,
      data: {
        audits,
        pagination: {
          page,
          limit,
          hasMore: audits.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Get audits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audits'
    });
  }
});

/**
 * @route GET /api/audits/:id
 * @desc Get audit by ID with associated issues
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await Audit.findById(id);
    if (!audit) {
      return res.status(404).json({
        success: false,
        error: 'Audit not found'
      });
    }

    // Get associated issues
    const issues = await Issue.findByAuditId(id);

    res.json({
      success: true,
      data: {
        audit: {
          ...audit,
          issues
        }
      }
    });

  } catch (error) {
    console.error('Get audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit'
    });
  }
});

/**
 * @route PUT /api/audits/:id
 * @desc Update audit status
 * @access Private
 */
router.put('/:id', [
  body('status')
    .isIn(['active', 'completed', 'cancelled'])
    .withMessage('Status must be active, completed, or cancelled')
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
    const { status } = req.body;

    const audit = await Audit.findById(id);
    if (!audit) {
      return res.status(404).json({
        success: false,
        error: 'Audit not found'
      });
    }

    // Check if user is the technician who created the audit
    if (audit.technician_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own audits'
      });
    }

    const updatedAudit = await Audit.updateStatus(id, status);

    res.json({
      success: true,
      message: 'Audit updated successfully',
      data: { audit: updatedAudit }
    });

  } catch (error) {
    console.error('Update audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update audit'
    });
  }
});

/**
 * @route POST /api/audits/:id/complete
 * @desc Complete an audit
 * @access Private
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await Audit.findById(id);
    if (!audit) {
      return res.status(404).json({
        success: false,
        error: 'Audit not found'
      });
    }

    // Check if user is the technician who created the audit
    if (audit.technician_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only complete your own audits'
      });
    }

    // Check if audit is already completed
    if (audit.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Audit is already completed'
      });
    }

    const completedAudit = await Audit.complete(id);

    res.json({
      success: true,
      message: 'Audit completed successfully',
      data: { audit: completedAudit }
    });

  } catch (error) {
    console.error('Complete audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete audit'
    });
  }
});

/**
 * @route DELETE /api/audits/:id
 * @desc Delete an audit (soft delete)
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const audit = await Audit.findById(id);
    if (!audit) {
      return res.status(404).json({
        success: false,
        error: 'Audit not found'
      });
    }

    // Check if user is the technician who created the audit
    if (audit.technician_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own audits'
      });
    }

    // Check if audit can be deleted (not completed)
    if (audit.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete completed audits'
      });
    }

    const deletedAudit = await Audit.delete(id);

    res.json({
      success: true,
      message: 'Audit deleted successfully',
      data: { audit: deletedAudit }
    });

  } catch (error) {
    console.error('Delete audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete audit'
    });
  }
});

/**
 * @route GET /api/audits/stats/overview
 * @desc Get audit statistics
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

    const stats = await Audit.getStatistics(filters);

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit statistics'
    });
  }
});

module.exports = router; 