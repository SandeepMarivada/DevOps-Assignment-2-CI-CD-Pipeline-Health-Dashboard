const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Pipeline } = require('../database/models');
const { logger } = require('../utils/logger');
const { Op } = require('sequelize');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/pipelines - Get all pipelines with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, team, search } = req.query;
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (team) whereClause.team = team;
    if (search) {
      whereClause.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows: pipelines } = await Pipeline.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: { exclude: ['config'] } // Don't return sensitive config data
    });

    res.json({
      success: true,
      data: {
        pipelines,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching pipelines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipelines'
    });
  }
});

// GET /api/pipelines/:id - Get pipeline by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findByPk(id);
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    res.json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    logger.error('Error fetching pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipeline'
    });
  }
});

// POST /api/pipelines - Create new pipeline
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be 1-100 characters'),
  body('type').isIn(['github-actions', 'jenkins', 'gitlab-ci', 'azure-devops']).withMessage('Invalid pipeline type'),
  body('url').isString().withMessage('URL is required'),
  body('token').optional().isString().withMessage('Token must be a string'),
  body('branch').optional().isString().withMessage('Branch must be a string')
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

    const { name, type, url, token, branch } = req.body;
    
    // Check if pipeline with same name already exists
    const existingPipeline = await Pipeline.findOne({ where: { name } });
    if (existingPipeline) {
      return res.status(409).json({
        success: false,
        error: 'Pipeline with this name already exists'
      });
    }

    const pipeline = await Pipeline.create({
      name,
      type,
      url,
      token,
      branch: branch || 'main',
      status: 'active'
    });

    logger.info(`Pipeline created: ${pipeline.id}`);
    
    res.status(201).json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    logger.error('Error creating pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create pipeline'
    });
  }
});

// PUT /api/pipelines/:id - Update pipeline
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('url').optional().isString(),
  body('token').optional().isString(),
  body('branch').optional().isString(),
  body('status').optional().isIn(['active', 'inactive', 'error'])
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
    const pipeline = await Pipeline.findByPk(id);
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    // Check if name is being changed and if it conflicts with existing pipeline
    if (req.body.name && req.body.name !== pipeline.name) {
      const existingPipeline = await Pipeline.findOne({ 
        where: { name: req.body.name, id: { [Op.ne]: id } }
      });
      if (existingPipeline) {
        return res.status(409).json({
          success: false,
          error: 'Pipeline with this name already exists'
        });
      }
    }

    await pipeline.update(req.body);
    
    logger.info(`Pipeline updated: ${pipeline.id}`);
    
    res.json({
      success: true,
      data: pipeline
    });
  } catch (error) {
    logger.error('Error updating pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pipeline'
    });
  }
});

// DELETE /api/pipelines/:id - Delete pipeline
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findByPk(id);
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    await pipeline.destroy();
    
    logger.info(`Pipeline deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Pipeline deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting pipeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete pipeline'
    });
  }
});

// POST /api/pipelines/:id/sync - Manually trigger pipeline sync
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findByPk(id);
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    // Update last sync time
    await pipeline.update({ 
      last_sync: new Date(),
      status: 'syncing'
    });

    // TODO: Trigger actual sync process based on pipeline type
    // This would integrate with the respective CI/CD tool APIs
    
    logger.info(`Pipeline sync triggered: ${id}`);
    
    res.json({
      success: true,
      message: 'Pipeline sync initiated',
      data: { last_sync: pipeline.last_sync }
    });
  } catch (error) {
    logger.error('Error triggering pipeline sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger pipeline sync'
    });
  }
});

// GET /api/pipelines/:id/status - Get pipeline status and recent builds
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const pipeline = await Pipeline.findByPk(id, {
      include: [{
        model: require('../database/models').Build,
        as: 'builds',
        limit: 10,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'status', 'started_at', 'completed_at', 'duration', 'branch', 'commit_hash']
      }]
    });
    
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    // Calculate basic metrics
    const builds = pipeline.builds || [];
    const totalBuilds = builds.length;
    const successfulBuilds = builds.filter(b => b.status === 'success').length;
    const successRate = totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0;
    const avgDuration = builds.length > 0 ? 
      builds.reduce((sum, b) => sum + (b.duration || 0), 0) / builds.length : 0;

    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          type: pipeline.type,
          status: pipeline.status,
          last_sync: pipeline.last_sync
        },
        metrics: {
          total_builds: totalBuilds,
          success_rate: Math.round(successRate * 100) / 100,
          average_duration: Math.round(avgDuration * 100) / 100,
          last_build: builds[0] || null
        },
        recent_builds: builds
      }
    });
  } catch (error) {
    logger.error('Error fetching pipeline status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipeline status'
    });
  }
});

module.exports = router;
