const express = require('express');
const { query, validationResult } = require('express-validator');
const Issue = require('../models/Issue');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/incidents
 * @desc Get all incidents (critical open issues) with filtering
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
    .isIn(['open', 'resolved'])
    .withMessage('Status must be open or resolved'),
  query('deviceType')
    .optional()
    .isIn(['power_supply_unit', 'power_distribution_unit', 'rear_door_heat_exchanger'])
    .withMessage('Device type must be power_supply_unit, power_distribution_unit, or rear_door_heat_exchanger')
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

    // Filter for incidents (critical severity issues)
    const filters = {
      limit,
      offset,
      severity: 'critical', // Only critical issues are considered incidents
      status: req.query.status || 'open', // Default to open incidents
      datacenter: req.query.datacenter,
      dataHall: req.query.dataHall,
      deviceType: req.query.deviceType
    };

    const incidents = await Issue.findAll(filters);

    // Transform the data to match incident format
    const formattedIncidents = incidents.map(incident => ({
      id: incident.id,
      datacenter: incident.datacenter,
      dataHall: incident.data_hall,
      description: incident.comments || `${incident.device_type} issue at ${incident.rack_location}`,
      rackLocation: incident.rack_location,
      deviceType: incident.device_type,
      psuId: incident.psu_id,
      uHeight: incident.u_height,
      severity: incident.severity,
      status: incident.status,
      technician: incident.first_name && incident.last_name 
        ? `${incident.first_name} ${incident.last_name}` 
        : 'Unknown',
      walkthroughId: incident.walkthrough_id,
      createdAt: incident.created_at,
      resolvedAt: incident.resolved_at
    }));

    res.json({
      success: true,
      data: {
        incidents: formattedIncidents,
        pagination: {
          page,
          limit,
          hasMore: incidents.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incidents'
    });
  }
});

/**
 * @route GET /api/incidents/active
 * @desc Get all active incidents (open critical issues)
 * @access Private
 */
router.get('/active', async (req, res) => {
  try {
    const activeIncidents = await Issue.getActiveIncidents();

    const formattedIncidents = activeIncidents.map(incident => ({
      id: incident.id,
      datacenter: incident.datacenter,
      dataHall: incident.data_hall,
      description: incident.comments || `${incident.device_type} issue at ${incident.rack_location}`,
      rackLocation: incident.rack_location,
      deviceType: incident.device_type,
      psuId: incident.psu_id,
      uHeight: incident.u_height,
      severity: incident.severity,
      status: incident.status,
      technician: incident.first_name && incident.last_name 
        ? `${incident.first_name} ${incident.last_name}` 
        : 'Unknown',
      walkthroughId: incident.walkthrough_id,
      createdAt: incident.created_at
    }));

    res.json({
      success: true,
      data: {
        incidents: formattedIncidents,
        count: formattedIncidents.length
      }
    });

  } catch (error) {
    console.error('Get active incidents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active incidents'
    });
  }
});

/**
 * @route GET /api/incidents/:id
 * @desc Get incident by ID
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const incident = await Issue.findById(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
    }

    // Only return if it's a critical issue (incident)
    if (incident.severity !== 'critical') {
      return res.status(404).json({
        success: false,
        error: 'Issue is not classified as an incident'
      });
    }

    const formattedIncident = {
      id: incident.id,
      datacenter: incident.datacenter,
      dataHall: incident.data_hall,
      description: incident.comments || `${incident.device_type} issue at ${incident.rack_location}`,
      rackLocation: incident.rack_location,
      deviceType: incident.device_type,
      psuId: incident.psu_id,
      uHeight: incident.u_height,
      severity: incident.severity,
      status: incident.status,
      technician: incident.first_name && incident.last_name 
        ? `${incident.first_name} ${incident.last_name}` 
        : 'Unknown',
      technicianEmail: incident.technician_email,
      walkthroughId: incident.walkthrough_id,
      createdAt: incident.created_at,
      resolvedAt: incident.resolved_at
    };

    res.json({
      success: true,
      data: { incident: formattedIncident }
    });

  } catch (error) {
    console.error('Get incident error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incident'
    });
  }
});

/**
 * @route PUT /api/incidents/:id/status
 * @desc Update incident status (resolve/reopen)
 * @access Private
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be either "open" or "resolved"'
      });
    }

    const incident = await Issue.findById(id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident not found'
      });
    }

    if (incident.severity !== 'critical') {
      return res.status(400).json({
        success: false,
        error: 'Only critical issues can be managed as incidents'
      });
    }

    const updatedIncident = await Issue.updateStatus(id, status);

    res.json({
      success: true,
      message: `Incident ${status === 'resolved' ? 'resolved' : 'reopened'} successfully`,
      data: { incident: updatedIncident }
    });

  } catch (error) {
    console.error('Update incident status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update incident status'
    });
  }
});

/**
 * @route GET /api/incidents/stats/summary
 * @desc Get incident statistics summary
 * @access Private
 */
router.get('/stats/summary', async (req, res) => {
  try {
    // Get all critical issues statistics
    const criticalIssueStats = await Issue.getStatistics({});
    const activeIncidents = await Issue.getActiveIncidents();

    const summary = {
      totalIncidents: parseInt(criticalIssueStats.critical_issues) || 0,
      activeIncidents: activeIncidents.length,
      resolvedIncidents: parseInt(criticalIssueStats.critical_issues) - activeIncidents.length || 0
    };

    res.json({
      success: true,
      data: { summary }
    });

  } catch (error) {
    console.error('Incident stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch incident statistics'
    });
  }
});

module.exports = router; 