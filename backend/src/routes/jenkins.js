const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const JenkinsService = require('../services/jenkins');
const { logger } = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/jenkins/status - Test Jenkins connection
router.get('/status', async (req, res) => {
  try {
    const { pipeline_id } = req.query;
    
    if (!pipeline_id) {
      return res.status(400).json({
        success: false,
        error: 'Pipeline ID is required'
      });
    }

    // Get pipeline details to get Jenkins configuration
    const { Pipeline } = require('../database/models');
    const pipeline = await Pipeline.findByPk(pipeline_id);
    
    if (!pipeline || pipeline.type !== 'jenkins') {
      return res.status(404).json({
        success: false,
        error: 'Jenkins pipeline not found'
      });
    }

    // Create Jenkins service instance
    const jenkinsConfig = {
      baseUrl: pipeline.url,
      username: 'admin',
      apiToken: pipeline.token
    };

    const jenkinsService = new JenkinsService(jenkinsConfig);
    
    // Test connection
    const connectionResult = await jenkinsService.testConnection();
    
    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          url: pipeline.url
        },
        connection: connectionResult
      }
    });
  } catch (error) {
    logger.error('Error testing Jenkins connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Jenkins connection',
      details: error.message
    });
  }
});

// GET /api/jenkins/jobs - Get all Jenkins jobs
router.get('/jobs', async (req, res) => {
  try {
    const { pipeline_id } = req.query;
    
    if (!pipeline_id) {
      return res.status(400).json({
        success: false,
        error: 'Pipeline ID is required'
      });
    }

    // Get pipeline details
    const { Pipeline } = require('../database/models');
    const pipeline = await Pipeline.findByPk(pipeline_id);
    
    if (!pipeline || pipeline.type !== 'jenkins') {
      return res.status(404).json({
        success: false,
        error: 'Jenkins pipeline not found'
      });
    }

    // Create Jenkins service instance
    const jenkinsConfig = {
      baseUrl: pipeline.url,
      username: 'admin',
      apiToken: pipeline.token
    };

    const jenkinsService = new JenkinsService(jenkinsConfig);
    
    // Get jobs from Jenkins
    const jobsResult = await jenkinsService.getJobs();
    
    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          url: pipeline.url
        },
        jobs: jobsResult.data
      }
    });
  } catch (error) {
    logger.error('Error fetching Jenkins jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Jenkins jobs',
      details: error.message
    });
  }
});

// GET /api/jenkins/jobs/:jobName - Get specific Jenkins job details
router.get('/jobs/:jobName', async (req, res) => {
  try {
    const { pipeline_id } = req.query;
    const { jobName } = req.params;
    
    if (!pipeline_id) {
      return res.status(400).json({
        success: false,
        error: 'Pipeline ID is required'
      });
    }

    // Get pipeline details
    const { Pipeline } = require('../database/models');
    const pipeline = await Pipeline.findByPk(pipeline_id);
    
    if (!pipeline || pipeline.type !== 'jenkins') {
      return res.status(404).json({
        success: false,
        error: 'Jenkins pipeline not found'
      });
    }

    // Create Jenkins service instance
    const jenkinsConfig = {
      baseUrl: pipeline.url,
      username: 'admin',
      apiToken: pipeline.token
    };

    const jenkinsService = new JenkinsService(jenkinsConfig);
    
    // Get job details from Jenkins
    const jobResult = await jenkinsService.getJob(jobName);
    
    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          url: pipeline.url
        },
        job: jobResult.data
      }
    });
  } catch (error) {
    logger.error(`Error fetching Jenkins job ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Jenkins job',
      details: error.message
    });
  }
});

// GET /api/jenkins/jobs/:jobName/builds/:buildNumber - Get specific build details
router.get('/jobs/:jobName/builds/:buildNumber', async (req, res) => {
  try {
    const { pipeline_id } = req.query;
    const { jobName, buildNumber } = req.params;
    
    if (!pipeline_id) {
      return res.status(400).json({
        success: false,
        error: 'Pipeline ID is required'
      });
    }

    // Get pipeline details
    const { Pipeline } = require('../database/models');
    const pipeline = await Pipeline.findByPk(pipeline_id);
    
    if (!pipeline || pipeline.type !== 'jenkins') {
      return res.status(404).json({
        success: false,
        error: 'Jenkins pipeline not found'
      });
    }

    // Create Jenkins service instance
    const jenkinsConfig = {
      baseUrl: pipeline.url,
      username: 'admin',
      apiToken: pipeline.token
    };

    const jenkinsService = new JenkinsService(jenkinsConfig);
    
    // Get build details from Jenkins
    const buildResult = await jenkinsService.getBuild(jobName, buildNumber);
    
    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          url: pipeline.url
        },
        build: buildResult.data
      }
    });
  } catch (error) {
    logger.error(`Error fetching Jenkins build ${req.params.jobName}#${req.params.buildNumber}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Jenkins build',
      details: error.message
    });
  }
});

// POST /api/jenkins/jobs/:jobName/build - Trigger a Jenkins build
router.post('/jobs/:jobName/build', async (req, res) => {
  try {
    const { pipeline_id } = req.query;
    const { jobName } = req.params;
    const { parameters } = req.body;
    
    if (!pipeline_id) {
      return res.status(400).json({
        success: false,
        error: 'Pipeline ID is required'
      });
    }

    // Get pipeline details
    const { Pipeline } = require('../database/models');
    const pipeline = await Pipeline.findByPk(pipeline_id);
    
    if (!pipeline || pipeline.type !== 'jenkins') {
      return res.status(404).json({
        success: false,
        error: 'Jenkins pipeline not found'
      });
    }

    // Create Jenkins service instance
    const jenkinsConfig = {
      baseUrl: pipeline.url,
      username: 'admin',
      apiToken: pipeline.token
    };

    const jenkinsService = new JenkinsService(jenkinsConfig);
    
    // Trigger build in Jenkins
    const buildResult = await jenkinsService.triggerBuild(jobName, parameters || {});
    
    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          url: pipeline.url
        },
        build: buildResult.data
      }
    });
  } catch (error) {
    logger.error(`Error triggering Jenkins build for ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger Jenkins build',
      details: error.message
    });
  }
});

// GET /api/jenkins/sync/:pipeline_id - Sync Jenkins data with our database
router.get('/sync/:pipeline_id', async (req, res) => {
  try {
    const { pipeline_id } = req.params;
    
    // Get pipeline details
    const { Pipeline, Build } = require('../database/models');
    const pipeline = await Pipeline.findByPk(pipeline_id);
    
    if (!pipeline || pipeline.type !== 'jenkins') {
      return res.status(404).json({
        success: false,
        error: 'Jenkins pipeline not found'
      });
    }

    // Create Jenkins service instance
    const jenkinsConfig = {
      baseUrl: pipeline.url,
      username: 'admin',
      apiToken: pipeline.token
    };

    const jenkinsService = new JenkinsService(jenkinsConfig);
    
    // Get all jobs from Jenkins
    const jobsResult = await jenkinsService.getJobs();
    const jobs = jobsResult.data;
    
    let totalBuilds = 0;
    let syncedBuilds = 0;
    let alertsCreated = 0;
    
    // Import SimpleAlertService for creating alerts
    const SimpleAlertService = require('../services/simpleAlertService');
    const alertService = new SimpleAlertService();
    
    // For each job, get recent builds and sync them
    for (const job of jobs) {
      // Process all builds from the job, not just last_build
      if (job.builds && job.builds.length > 0) {
        for (const build of job.builds) {
          try {
            // Check if build already exists
            const existingBuild = await Build.findOne({
              where: {
                pipeline_id: pipeline_id,
                build_number: build.number
              }
            });
            
            if (!existingBuild) {
              // Map Jenkins result to our status
              let buildStatus = 'pending';
              if (build.result === 'SUCCESS') buildStatus = 'success';
              else if (build.result === 'FAILURE') buildStatus = 'failed';
              else if (build.result === 'ABORTED') buildStatus = 'cancelled';
              else if (build.result === 'UNSTABLE') buildStatus = 'failed';
              
              // Create new build record
              const newBuild = await Build.create({
                pipeline_id: pipeline_id,
                build_number: build.number,
                status: buildStatus,
                branch: 'main', // Default branch
                commit_hash: `jenkins-${job.name}-${build.number}`,
                author: 'jenkins',
                started_at: new Date(build.timestamp),
                completed_at: new Date(build.timestamp + (build.duration || 0)),
                duration: build.duration || 0
              });
              
              syncedBuilds++;
              
              // Create alert for failed builds
              if (buildStatus === 'failed') {
                try {
                  await alertService.sendBuildAlert(newBuild, pipeline, 'failed');
                  alertsCreated++;
                  logger.info(`Alert created for failed build: ${pipeline.name} #${newBuild.build_number}`);
                } catch (alertError) {
                  logger.error(`Error creating alert for build ${newBuild.id}:`, alertError);
                }
              }
            }
            totalBuilds++;
          } catch (buildError) {
            logger.error(`Error syncing build ${job.name}#${build.number}:`, buildError);
          }
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          url: pipeline.url
        },
        sync_result: {
          total_jobs: jobs.length,
          total_builds: totalBuilds,
          synced_builds: syncedBuilds,
          alerts_created: alertsCreated,
          message: `Successfully synced ${syncedBuilds} new builds from ${jobs.length} jobs and created ${alertsCreated} alerts`
        }
      }
    });
  } catch (error) {
    logger.error(`Error syncing Jenkins data for pipeline ${req.params.pipeline_id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Jenkins data',
      details: error.message
    });
  }
});

module.exports = router;
