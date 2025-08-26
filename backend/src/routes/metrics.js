const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { Build, Pipeline } = require('../database/models');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/metrics/dashboard - Get dashboard overview metrics
router.get('/dashboard', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365')
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

    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all builds in the date range
    const builds = await Build.findAll({
      where: {
        started_at: { [require('sequelize').Op.gte]: startDate }
      },
      include: [{
        model: Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'status']
      }],
      order: [['started_at', 'ASC']]
    });

    // Get all pipelines
    const pipelines = await Pipeline.findAll({
      attributes: ['id', 'name', 'type', 'status']
    });

    // Calculate overall metrics
    const totalBuilds = builds.length;
    const statusCounts = builds.reduce((acc, build) => {
      acc[build.status] = (acc[build.status] || 0) + 1;
      return acc;
    }, {});

    const successfulBuilds = statusCounts.success || 0;
    const failedBuilds = statusCounts.failed || 0;
    const runningBuilds = statusCounts.running || 0;
    const pendingBuilds = statusCounts.pending || 0;

    const successRate = totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0;
    const failureRate = totalBuilds > 0 ? (failedBuilds / totalBuilds) * 100 : 0;

    // Calculate average build duration
    const buildsWithDuration = builds.filter(b => b.duration && b.duration > 0);
    const avgDuration = buildsWithDuration.length > 0 ? 
      buildsWithDuration.reduce((sum, b) => sum + b.duration, 0) / buildsWithDuration.length : 0;

    // Pipeline-specific metrics
    const pipelineMetrics = pipelines.map(pipeline => {
      const pipelineBuilds = builds.filter(b => b.pipeline_id === pipeline.id);
      const pipelineTotalBuilds = pipelineBuilds.length;
      const pipelineSuccessBuilds = pipelineBuilds.filter(b => b.status === 'success').length;
      const pipelineSuccessRate = pipelineTotalBuilds > 0 ? 
        (pipelineSuccessBuilds / pipelineTotalBuilds) * 100 : 0;
      
      const pipelineBuildsWithDuration = pipelineBuilds.filter(b => b.duration && b.duration > 0);
      const pipelineAvgDuration = pipelineBuildsWithDuration.length > 0 ? 
        pipelineBuildsWithDuration.reduce((sum, b) => sum + b.duration, 0) / pipelineBuildsWithDuration.length : 0;

      return {
        pipeline_id: pipeline.id,
        pipeline_name: pipeline.name,
        pipeline_type: pipeline.type,
        pipeline_status: pipeline.status,
        total_builds: pipelineTotalBuilds,
        success_rate: Math.round(pipelineSuccessRate * 100) / 100,
        average_duration: Math.round(pipelineAvgDuration * 100) / 100,
        last_build: pipelineBuilds[0] || null
      };
    });

    // Daily trends
    const dailyMetrics = {};
    const hourlyMetrics = {};
    
    builds.forEach(build => {
      const date = build.started_at.toISOString().split('T')[0];
      const hour = build.started_at.getHours();
      
      if (!dailyMetrics[date]) {
        dailyMetrics[date] = { total: 0, success: 0, failed: 0, running: 0, pending: 0 };
      }
      if (!hourlyMetrics[hour]) {
        hourlyMetrics[hour] = { total: 0, success: 0, failed: 0 };
      }
      
      dailyMetrics[date].total++;
      dailyMetrics[date][build.status]++;
      
      if (['success', 'failed'].includes(build.status)) {
        hourlyMetrics[hour].total++;
        hourlyMetrics[hour][build.status]++;
      }
    });

    // Team metrics - simplified since team column doesn't exist
    const teamMetrics = {};
    // For now, we'll use pipeline type as a team identifier
    pipelineMetrics.forEach(metric => {
      const teamKey = metric.pipeline_type || 'Unknown';
      if (!teamMetrics[teamKey]) {
        teamMetrics[teamKey] = { total_builds: 0, success_rate: 0, pipeline_count: 0 };
      }
      teamMetrics[teamKey].total_builds += metric.total_builds;
      teamMetrics[teamKey].pipeline_count++;
    });

    // Calculate team success rates
    Object.keys(teamMetrics).forEach(team => {
      const teamBuilds = builds.filter(b => {
        const pipeline = pipelines.find(p => p.id === b.pipeline_id);
        return pipeline && pipeline.type === team;
      });
      const teamSuccessBuilds = teamBuilds.filter(b => b.status === 'success').length;
      teamMetrics[team].success_rate = teamBuilds.length > 0 ? 
        Math.round((teamSuccessBuilds / teamBuilds.length) * 10000) / 100 : 0;
    });

    res.json({
      success: true,
      data: {
        overview: {
          total_builds: totalBuilds,
          success_rate: Math.round(successRate * 100) / 100,
          failure_rate: Math.round(failureRate * 100) / 100,
          average_duration: Math.round(avgDuration * 100) / 100,
          status_distribution: {
            success: successfulBuilds,
            failed: failedBuilds,
            running: runningBuilds,
            pending: pendingBuilds
          }
        },
        pipelines: pipelineMetrics,
        teams: teamMetrics,
        trends: {
          daily: dailyMetrics,
          hourly: hourlyMetrics,
          period_days: parseInt(days)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

// GET /api/metrics/pipelines/:id - Get detailed metrics for a specific pipeline
router.get('/pipelines/:id', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365')
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
    const { days = 30 } = req.query;

    const pipeline = await Pipeline.findByPk(id);
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const builds = await Build.findAll({
      where: {
        pipeline_id: parseInt(id),
        started_at: { [require('sequelize').Op.gte]: startDate }
      },
      order: [['started_at', 'ASC']]
    });

    // Calculate pipeline-specific metrics
    const totalBuilds = builds.length;
    const statusCounts = builds.reduce((acc, build) => {
      acc[build.status] = (acc[build.status] || 0) + 1;
      return acc;
    }, {});

    const successfulBuilds = statusCounts.success || 0;
    const failedBuilds = statusCounts.failed || 0;
    const successRate = totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0;

    // Duration analysis
    const buildsWithDuration = builds.filter(b => b.duration && b.duration > 0);
    const avgDuration = buildsWithDuration.length > 0 ? 
      buildsWithDuration.reduce((sum, b) => sum + b.duration, 0) / buildsWithDuration.length : 0;
    
    const minDuration = buildsWithDuration.length > 0 ? 
      Math.min(...buildsWithDuration.map(b => b.duration)) : 0;
    const maxDuration = buildsWithDuration.length > 0 ? 
      Math.max(...buildsWithDuration.map(b => b.duration)) : 0;

    // Branch analysis
    const branchMetrics = {};
    builds.forEach(build => {
      if (!branchMetrics[build.branch]) {
        branchMetrics[build.branch] = { total: 0, success: 0, failed: 0 };
      }
      branchMetrics[build.branch].total++;
      if (build.status === 'success') branchMetrics[build.branch].success++;
      if (build.status === 'failed') branchMetrics[build.branch].failed++;
    });

    // Author analysis
    const authorMetrics = {};
    builds.forEach(build => {
      if (!authorMetrics[build.author]) {
        authorMetrics[build.author] = { total: 0, success: 0, failed: 0 };
      }
      authorMetrics[build.author].total++;
      if (build.status === 'success') authorMetrics[build.author].success++;
      if (build.status === 'failed') authorMetrics[build.author].failed++;
    });

    // Time-based analysis
    const dailyMetrics = {};
    const hourlyMetrics = {};
    
    builds.forEach(build => {
      const date = build.started_at.toISOString().split('T')[0];
      const hour = build.started_at.getHours();
      
      if (!dailyMetrics[date]) {
        dailyMetrics[date] = { total: 0, success: 0, failed: 0, duration_sum: 0 };
      }
      if (!hourlyMetrics[hour]) {
        hourlyMetrics[hour] = { total: 0, success: 0, failed: 0 };
      }
      
      dailyMetrics[date].total++;
      dailyMetrics[date][build.status]++;
      if (build.duration) dailyMetrics[date].duration_sum += build.duration;
      
      hourlyMetrics[hour].total++;
      if (['success', 'failed'].includes(build.status)) {
        hourlyMetrics[hour][build.status]++;
      }
    });

    // Calculate daily average duration
    Object.keys(dailyMetrics).forEach(date => {
      if (dailyMetrics[date].total > 0) {
        dailyMetrics[date].average_duration = Math.round(
          dailyMetrics[date].duration_sum / dailyMetrics[date].total * 100
        ) / 100;
      }
    });

    // Failure analysis
    const failureReasons = {};
    builds.filter(b => b.status === 'failed' && b.failure_reason).forEach(build => {
      const reason = build.failure_reason;
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          type: pipeline.type,
          status: pipeline.status,
          team: pipeline.team
        },
        summary: {
          total_builds: totalBuilds,
          success_rate: Math.round(successRate * 100) / 100,
          failure_rate: Math.round((100 - successRate) * 100) / 100,
          average_duration: Math.round(avgDuration * 100) / 100,
          min_duration: minDuration,
          max_duration: maxDuration,
          status_distribution: statusCounts
        },
        analysis: {
          branches: branchMetrics,
          authors: authorMetrics,
          failure_reasons: failureReasons
        },
        trends: {
          daily: dailyMetrics,
          hourly: hourlyMetrics,
          period_days: parseInt(days)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching pipeline metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pipeline metrics'
    });
  }
});

// GET /api/metrics/trends - Get trend analysis across all pipelines
router.get('/trends', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365'),
  query('metric').optional().isIn(['success_rate', 'build_count', 'duration']).withMessage('Invalid metric type')
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

    const { days = 30, metric = 'success_rate' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const builds = await Build.findAll({
      where: {
        started_at: { [require('sequelize').Op.gte]: startDate }
      },
      include: [{
        model: Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'team']
      }],
      order: [['started_at', 'ASC']]
    });

    const pipelines = await Pipeline.findAll({
      attributes: ['id', 'name', 'type', 'team']
    });

    // Group builds by date and pipeline
    const datePipelineMetrics = {};
    
    builds.forEach(build => {
      const date = build.started_at.toISOString().split('T')[0];
      if (!datePipelineMetrics[date]) {
        datePipelineMetrics[date] = {};
      }
      
      const pipelineId = build.pipeline_id;
      if (!datePipelineMetrics[date][pipelineId]) {
        datePipelineMetrics[date][pipelineId] = {
          total: 0,
          success: 0,
          failed: 0,
          duration_sum: 0,
          duration_count: 0
        };
      }
      
      datePipelineMetrics[date][pipelineId].total++;
      if (build.status === 'success') datePipelineMetrics[date][pipelineId].success++;
      if (build.status === 'failed') datePipelineMetrics[date][pipelineId].failed++;
      if (build.duration) {
        datePipelineMetrics[date][pipelineId].duration_sum += build.duration;
        datePipelineMetrics[date][pipelineId].duration_count++;
      }
    });

    // Calculate trends for each pipeline
    const trends = {};
    pipelines.forEach(pipeline => {
      const pipelineId = pipeline.id;
      trends[pipelineId] = {
        pipeline_name: pipeline.name,
        pipeline_type: pipeline.type,
        team: pipeline.team,
        data: []
      };

      // Generate data points for each day
      for (let i = 0; i < parseInt(days); i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayData = datePipelineMetrics[dateStr]?.[pipelineId];
        let value = 0;
        
        if (dayData) {
          switch (metric) {
            case 'success_rate':
              value = dayData.total > 0 ? (dayData.success / dayData.total) * 100 : 0;
              break;
            case 'build_count':
              value = dayData.total;
              break;
            case 'duration':
              value = dayData.duration_count > 0 ? 
                dayData.duration_sum / dayData.duration_count : 0;
              break;
          }
        }
        
        trends[pipelineId].data.unshift({
          date: dateStr,
          value: Math.round(value * 100) / 100
        });
      }
    });

    res.json({
      success: true,
      data: {
        metric_type: metric,
        period_days: parseInt(days),
        trends: trends
      }
    });
  } catch (error) {
    logger.error('Error fetching trend metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trend metrics'
    });
  }
});

// GET /api/metrics/performance - Get performance benchmarks and comparisons
router.get('/performance', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be 1-365')
], async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const builds = await Build.findAll({
      where: {
        started_at: { [require('sequelize').Op.gte]: startDate },
        status: { [require('sequelize').Op.in]: ['success', 'failed'] }
      },
      include: [{
        model: Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'team']
      }]
    });

    // Calculate performance benchmarks
    const allDurations = builds.filter(b => b.duration && b.duration > 0).map(b => b.duration);
    const avgDuration = allDurations.length > 0 ? 
      allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length : 0;
    
    const sortedDurations = allDurations.sort((a, b) => a - b);
    const medianDuration = sortedDurations.length > 0 ? 
      sortedDurations[Math.floor(sortedDurations.length / 2)] : 0;
    
    const p95Duration = sortedDurations.length > 0 ? 
      sortedDurations[Math.floor(sortedDurations.length * 0.95)] : 0;
    const p99Duration = sortedDurations.length > 0 ? 
      sortedDurations[Math.floor(sortedDurations.length * 0.99)] : 0;

    // Team performance comparison
    const teamPerformance = {};
    builds.forEach(build => {
      const team = build.pipeline?.team || 'Unknown';
      if (!teamPerformance[team]) {
        teamPerformance[team] = {
          total_builds: 0,
          success_builds: 0,
          duration_sum: 0,
          duration_count: 0
        };
      }
      
      teamPerformance[team].total_builds++;
      if (build.status === 'success') teamPerformance[team].success_builds++;
      if (build.duration) {
        teamPerformance[team].duration_sum += build.duration;
        teamPerformance[team].duration_count++;
      }
    });

    // Calculate team metrics
    Object.keys(teamPerformance).forEach(team => {
      const data = teamPerformance[team];
      data.success_rate = data.total_builds > 0 ? 
        Math.round((data.success_builds / data.total_builds) * 10000) / 100 : 0;
      data.average_duration = data.duration_count > 0 ? 
        Math.round((data.duration_sum / data.duration_count) * 100) / 100 : 0;
    });

    // Pipeline type performance
    const typePerformance = {};
    builds.forEach(build => {
      const type = build.pipeline?.type || 'Unknown';
      if (!typePerformance[type]) {
        typePerformance[type] = {
          total_builds: 0,
          success_builds: 0,
          duration_sum: 0,
          duration_count: 0
        };
      }
      
      typePerformance[type].total_builds++;
      if (build.status === 'success') typePerformance[type].success_builds++;
      if (build.duration) {
        typePerformance[type].duration_sum += build.duration;
        typePerformance[type].duration_count++;
      }
    });

    // Calculate type metrics
    Object.keys(typePerformance).forEach(type => {
      const data = typePerformance[type];
      data.success_rate = data.total_builds > 0 ? 
        Math.round((data.success_builds / data.total_builds) * 10000) / 100 : 0;
      data.average_duration = data.duration_count > 0 ? 
        Math.round((data.duration_sum / data.duration_count) * 100) / 100 : 0;
    });

    res.json({
      success: true,
      data: {
        benchmarks: {
          average_duration: Math.round(avgDuration * 100) / 100,
          median_duration: Math.round(medianDuration * 100) / 100,
          p95_duration: Math.round(p95Duration * 100) / 100,
          p99_duration: Math.round(p99Duration * 100) / 100,
          total_builds: builds.length
        },
        team_comparison: teamPerformance,
        type_comparison: typePerformance,
        period_days: parseInt(days)
      }
    });
  } catch (error) {
    logger.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

module.exports = router;
