const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { Build, Pipeline } = require('../database/models');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/builds - Get all builds with pagination and filtering
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('pipeline_id').optional().isInt().withMessage('Pipeline ID must be an integer'),
  query('status').optional().isIn(['pending', 'running', 'success', 'failed', 'cancelled']),
  query('branch').optional().trim(),
  query('author').optional().trim(),
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
      pipeline_id, 
      status, 
      branch, 
      author, 
      date_from, 
      date_to 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    if (pipeline_id) whereClause.pipeline_id = parseInt(pipeline_id);
    if (status) whereClause.status = status;
    if (branch) whereClause.branch = { [require('sequelize').Op.iLike]: `%${branch}%` };
    if (author) whereClause.author = { [require('sequelize').Op.iLike]: `%${author}%` };
    
    // Date range filtering
    if (date_from || date_to) {
      whereClause.started_at = {};
      if (date_from) whereClause.started_at[require('sequelize').Op.gte] = new Date(date_from);
      if (date_to) whereClause.started_at[require('sequelize').Op.lte] = new Date(date_to);
    }

    const { count, rows: builds } = await Build.findAndCountAll({
      where: whereClause,
      include: [{
        model: Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'status']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['started_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        builds,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching builds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch builds'
    });
  }
});

// GET /api/builds/:id - Get build by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const build = await Build.findByPk(id, {
      include: [{
        model: Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'status']
      }]
    });
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      });
    }

    res.json({
      success: true,
      data: build
    });
  } catch (error) {
    logger.error('Error fetching build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch build'
    });
  }
});

// GET /api/builds/:id/logs - Get build logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const build = await Build.findByPk(id, {
      attributes: ['id', 'logs', 'status', 'pipeline_id']
    });
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      });
    }

    if (!build.logs) {
      return res.json({
        success: true,
        data: {
          logs: '',
          message: 'No logs available for this build'
        }
      });
    }

    res.json({
      success: true,
      data: {
        logs: build.logs,
        build_id: build.id,
        status: build.status
      }
    });
  } catch (error) {
    logger.error('Error fetching build logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch build logs'
    });
  }
});

// GET /api/builds/:id/artifacts - Get build artifacts
router.get('/:id/artifacts', async (req, res) => {
  try {
    const { id } = req.params;
    const build = await Build.findByPk(id, {
      attributes: ['id', 'artifacts', 'status', 'pipeline_id']
    });
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      });
    }

    if (!build.artifacts || Object.keys(build.artifacts).length === 0) {
      return res.json({
        success: true,
        data: {
          artifacts: {},
          message: 'No artifacts available for this build'
        }
      });
    }

    res.json({
      success: true,
      data: {
        artifacts: build.artifacts,
        build_id: build.id,
        status: build.status
      }
    });
  } catch (error) {
    logger.error('Error fetching build artifacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch build artifacts'
    });
  }
});

// POST /api/builds - Create new build (usually from webhooks)
router.post('/', async (req, res) => {
  try {
    const { 
      pipeline_id, 
      build_number, 
      branch, 
      commit_hash, 
      commit_message, 
      author, 
      trigger_type,
      environment 
    } = req.body;

    // Validate required fields
    if (!pipeline_id || !build_number || !branch || !commit_hash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pipeline_id, build_number, branch, commit_hash'
      });
    }

    // Check if pipeline exists
    const pipeline = await Pipeline.findByPk(pipeline_id);
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    // Check if build with same build_number already exists for this pipeline
    const existingBuild = await Build.findOne({ 
      where: { build_number, pipeline_id } 
    });
    
    if (existingBuild) {
      return res.status(409).json({
        success: false,
        error: 'Build with this build number already exists for this pipeline'
      });
    }

    const build = await Build.create({
      pipeline_id,
      build_number,
      branch,
      commit_hash,
      commit_message: commit_message || '',
      author: author || 'Unknown',
      status: 'pending',
      trigger_type: trigger_type || 'manual',
      environment: environment || 'default',
      started_at: new Date()
    });

    logger.info(`Build created: ${build.id} for pipeline ${pipeline_id}`);
    
    res.status(201).json({
      success: true,
      data: build
    });
  } catch (error) {
    logger.error('Error creating build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create build'
    });
  }
});

// PUT /api/builds/:id - Update build status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      logs, 
      artifacts, 
      failure_reason, 
      completed_at,
      duration 
    } = req.body;

    const build = await Build.findByPk(id);
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['running', 'cancelled'],
      'running': ['success', 'failed', 'cancelled'],
      'success': [],
      'failed': [],
      'cancelled': []
    };

    if (status && !validTransitions[build.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from ${build.status} to ${status}`
      });
    }

    // Calculate duration if not provided
    let finalDuration = duration;
    if (status && ['success', 'failed', 'cancelled'].includes(status) && !duration) {
      finalDuration = build.started_at ? 
        Math.floor((new Date() - new Date(build.started_at)) / 1000) : 0;
    }

    const updateData = {
      ...(status && { status }),
      ...(logs && { logs }),
      ...(artifacts && { artifacts }),
      ...(failure_reason && { failure_reason }),
      ...(completed_at && { completed_at }),
      ...(finalDuration && { duration: finalDuration })
    };

    await build.update(updateData);
    
    logger.info(`Build updated: ${id} status: ${status || build.status}`);
    
    res.json({
      success: true,
      data: build
    });
  } catch (error) {
    logger.error('Error updating build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update build'
    });
  }
});

// GET /api/builds/metrics/summary - Get build metrics summary
router.get('/metrics/summary', async (req, res) => {
  try {
    const { pipeline_id, days = 30 } = req.query;
    
    const whereClause = {};
    if (pipeline_id) whereClause.pipeline_id = parseInt(pipeline_id);
    
    // Date range for metrics
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    whereClause.started_at = { [require('sequelize').Op.gte]: startDate };

    const builds = await Build.findAll({
      where: whereClause,
      attributes: ['status', 'duration', 'started_at', 'pipeline_id']
    });

    // Calculate metrics
    const totalBuilds = builds.length;
    const statusCounts = builds.reduce((acc, build) => {
      acc[build.status] = (acc[build.status] || 0) + 1;
      return acc;
    }, {});

    const successfulBuilds = statusCounts.success || 0;
    const failedBuilds = statusCounts.failed || 0;
    const successRate = totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0;

    const buildsWithDuration = builds.filter(b => b.duration && b.duration > 0);
    const avgDuration = buildsWithDuration.length > 0 ? 
      buildsWithDuration.reduce((sum, b) => sum + b.duration, 0) / buildsWithDuration.length : 0;

    // Daily build count
    const dailyBuilds = builds.reduce((acc, build) => {
      const date = build.started_at.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          total_builds: totalBuilds,
          success_rate: Math.round(successRate * 100) / 100,
          average_duration: Math.round(avgDuration * 100) / 100,
          status_distribution: statusCounts
        },
        trends: {
          daily_builds: dailyBuilds,
          period_days: parseInt(days)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching build metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch build metrics'
    });
  }
});

// DELETE /api/builds/:id - Delete build by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const build = await Build.findByPk(id);
    
    if (!build) {
      return res.status(404).json({
        success: false,
        error: 'Build not found'
      });
    }

    await build.destroy();
    
    logger.info(`Build deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Build deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting build:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete build'
    });
  }
});

module.exports = router;
