const express = require('express');
const Audit = require('../models/Audit');
const Issue = require('../models/Issue');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route GET /api/dashboard/metrics
 * @desc Get dashboard metrics and statistics
 * @access Private
 */
router.get('/metrics', async (req, res) => {
  try {
    // Get audit statistics
    const auditStats = await Audit.getStatistics();
    
    // Get issue statistics
    const issueStats = await Issue.getStatistics();
    
    // Get active incidents (critical open issues)
    const activeIncidents = await Issue.getActiveIncidents();
    
    // Get recent audits
    const recentAudits = await Audit.getRecent(5);

    res.json({
      success: true,
      data: {
        metrics: {
          completedAudits: parseInt(auditStats.completed_audits) || 0,
          activeIncidents: activeIncidents.length,
          totalIssues: parseInt(issueStats.total_issues) || 0,
          criticalIssues: parseInt(issueStats.critical_issues) || 0,
          resolvedIncidents: 0 // Calculated as issues that were resolved
        },
        recentAudits: recentAudits.map(audit => ({
          id: audit.id,
          datacenter: audit.datacenter,
          dataHall: audit.data_hall,
          walkthroughId: audit.walkthrough_id,
          technician: `${audit.first_name} ${audit.last_name}`,
          issuesCount: parseInt(audit.issues_count) || 0,
          status: audit.status,
          date: audit.created_at
        })),
        activeIncidents: activeIncidents.map(incident => ({
          id: incident.id,
          location: `${incident.datacenter} - ${incident.data_hall}`,
          description: incident.comments || 'No description',
          severity: incident.severity,
          date: incident.created_at
        }))
      }
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

/**
 * @route GET /api/dashboard/charts
 * @desc Get chart data for dashboard
 * @access Private
 */
router.get('/charts', async (req, res) => {
  try {
    // Get issues by severity count
    const issuesBySeverity = await Issue.getCountBySeverity();
    
    res.json({
      success: true,
      data: {
        issuesBySeverity: issuesBySeverity.reduce((acc, item) => {
          acc[item.severity] = parseInt(item.count);
          return acc;
        }, { critical: 0, warning: 0, healthy: 0 })
      }
    });

  } catch (error) {
    console.error('Dashboard charts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data'
    });
  }
});

module.exports = router; 