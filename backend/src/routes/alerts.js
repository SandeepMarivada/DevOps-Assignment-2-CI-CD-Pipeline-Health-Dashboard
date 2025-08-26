const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Alert, AlertHistory, Pipeline, Build } = require('../database/models');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/alerts - Get all alerts with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['active', 'inactive', 'triggered']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('pipeline_id').optional().isInt().withMessage('Pipeline ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, status, severity, pipeline_id } = req.query;
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (severity) whereClause.severity = severity;
    if (pipeline_id) whereClause.pipeline_id = parseInt(pipeline_id);

    const { count, rows: alerts } = await Alert.findAndCountAll({
      where: whereClause,
      include: [{
        model: Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'status']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

// GET /api/alerts/:id - Get alert by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByPk(id, {
      include: [{
        model: Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'status']
      }]
    });
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert'
    });
  }
});

// POST /api/alerts - Create new alert rule
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('pipeline_id').isString().withMessage('Pipeline ID must be a string'),
  body('condition_type').isIn(['success_rate', 'build_time', 'failure_count', 'consecutive_failures']).withMessage('Invalid condition type'),
  body('threshold').isFloat({ min: 0 }).withMessage('Threshold must be a positive number'),
  body('operator').isIn(['<', '<=', '>', '>=', '==', '!=']).withMessage('Invalid operator'),
  body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('channels').isArray().withMessage('Channels must be an array'),
  body('channels.*').isIn(['email', 'slack', 'webhook']).withMessage('Invalid channel type'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
  body('cooldown_minutes').optional().isInt({ min: 1, max: 1440 }).withMessage('Cooldown must be 1-1440 minutes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      name, 
      description, 
      pipeline_id, 
      condition_type, 
      threshold, 
      operator, 
      severity, 
      channels, 
      enabled = true,
      cooldown_minutes = 30
    } = req.body;

    // Check if pipeline exists
    const pipeline = await Pipeline.findByPk(pipeline_id);
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    // Check if alert with same name already exists for this pipeline
    const existingAlert = await Alert.findOne({ 
      where: { name, pipeline_id } 
    });
    
    if (existingAlert) {
      return res.status(409).json({
        success: false,
        error: 'Alert with this name already exists for this pipeline'
      });
    }

    const alert = await Alert.create({
      name,
      description,
      pipeline_id,
      condition_type,
      threshold,
      operator,
      severity,
      channels,
      enabled,
      cooldown_minutes,
      created_by: req.user.id
    });

    logger.info(`Alert created: ${alert.id} by user ${req.user.id}`);
    
    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert'
    });
  }
});

// PUT /api/alerts/:id - Update alert rule
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('condition_type').optional().isIn(['success_rate', 'build_time', 'failure_count', 'consecutive_failures']),
  body('threshold').optional().isFloat({ min: 0 }),
  body('operator').optional().isIn(['<', '<=', '>', '>=', '==', '!=']),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('channels').optional().isArray(),
  body('channels.*').optional().isIn(['email', 'slack', 'webhook']),
  body('enabled').optional().isBoolean(),
  body('cooldown_minutes').optional().isInt({ min: 1, max: 1440 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const alert = await Alert.findByPk(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Check if name is being changed and if it conflicts with existing alert
    if (req.body.name && req.body.name !== alert.name) {
      const existingAlert = await Alert.findOne({ 
        where: { name: req.body.name, pipeline_id: alert.pipeline_id, id: { [require('sequelize').Op.ne]: id } }
      });
      if (existingAlert) {
        return res.status(409).json({
          success: false,
          error: 'Alert with this name already exists for this pipeline'
        });
      }
    }

    await alert.update(req.body);
    
    logger.info(`Alert updated: ${alert.id} by user ${req.user.id}`);
    
    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    logger.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert'
    });
  }
});

// DELETE /api/alerts/:id - Delete alert rule
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByPk(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    await alert.destroy();
    
    logger.info(`Alert deleted: ${id} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert'
    });
  }
});

// POST /api/alerts/:id/test - Test alert rule
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await Alert.findByPk(id, {
      include: [{
        model: Pipeline,
        as: 'pipeline'
      }]
    });
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    if (!alert.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Cannot test disabled alert'
      });
    }

    // TODO: Implement actual alert testing logic
    // This would evaluate the alert condition against current pipeline metrics
    // and return whether the alert would trigger
    
    logger.info(`Alert test triggered: ${alert.id} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Alert test initiated',
      data: {
        alert_id: alert.id,
        alert_name: alert.name,
        condition: `${alert.condition_type} ${alert.operator} ${alert.threshold}`,
        severity: alert.severity
      }
    });
  } catch (error) {
    logger.error('Error testing alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test alert'
    });
  }
});

// GET /api/alerts/:id/history - Get alert trigger history
router.get('/:id/history', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Check if alert exists
    const alert = await Alert.findByPk(id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    const { count, rows: history } = await AlertHistory.findAndCountAll({
      where: { alert_id: parseInt(id) },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['triggered_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        alert: {
          id: alert.id,
          name: alert.name,
          severity: alert.severity
        },
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching alert history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert history'
    });
  }
});

// GET /api/alerts/history/all - Get all alert trigger history
router.get('/history/all', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('alert_id').optional().isInt().withMessage('Alert ID must be an integer'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('date_from').optional().isISO8601().withMessage('Date from must be valid ISO date'),
  query('date_to').optional().isISO8601().withMessage('Date to must be valid ISO date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      alert_id, 
      severity, 
      date_from, 
      date_to 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    if (alert_id) whereClause.alert_id = parseInt(alert_id);
    if (severity) whereClause.severity = severity;
    
    // Date range filtering
    if (date_from || date_to) {
      whereClause.triggered_at = {};
      if (date_from) whereClause.triggered_at[require('sequelize').Op.gte] = new Date(date_from);
      if (date_to) whereClause.triggered_at[require('sequelize').Op.lte] = new Date(date_to);
    }

    const { count, rows: history } = await AlertHistory.findAndCountAll({
      where: whereClause,
      include: [{
        model: Alert,
        as: 'alert',
        attributes: ['id', 'name', 'severity', 'condition_type'],
        include: [{
          model: Pipeline,
          as: 'pipeline',
          attributes: ['id', 'name', 'type', 'team']
        }]
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['triggered_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching alert history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert history'
    });
  }
});

// POST /api/alerts/:id/acknowledge - Acknowledge triggered alert
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { acknowledged_by, notes } = req.body;

    const alert = await Alert.findByPk(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }

    // Update alert status to acknowledged
    await alert.update({
      status: 'acknowledged',
      acknowledged_at: new Date(),
      acknowledged_by: acknowledged_by || req.user.id
    });

    // Create history entry
    await AlertHistory.create({
      alert_id: parseInt(id),
      triggered_at: new Date(),
      status: 'acknowledged',
      severity: alert.severity,
      metadata: {
        acknowledged_by: acknowledged_by || req.user.id,
        notes: notes || '',
        action: 'acknowledged'
      }
    });

    logger.info(`Alert acknowledged: ${id} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: {
        alert_id: alert.id,
        status: 'acknowledged',
        acknowledged_at: alert.acknowledged_at
      }
    });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

module.exports = router;
