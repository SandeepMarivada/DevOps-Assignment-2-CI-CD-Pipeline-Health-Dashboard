const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { Pipeline, Build } = require('../database/models');
const githubActionsService = require('../services/githubActions');
const logger = require('../utils/logger');

const router = express.Router();

// Webhook endpoints don't require authentication (they're called by external services)
// but we can use optionalAuth to get user info if available

// POST /api/webhooks/github - GitHub webhook endpoint
router.post('/github', [
  body('ref').optional().isString(),
  body('head_commit').optional().isObject(),
  body('workflow_run').optional().isObject(),
  body('action').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('GitHub webhook validation failed:', errors.array());
      // Don't return error for webhook validation failures
    }

    const { ref, head_commit, workflow_run, action } = req.body;
    
    logger.info('GitHub webhook received:', {
      ref,
      action,
      has_commit: !!head_commit,
      has_workflow: !!workflow_run
    });

    // Handle different webhook event types
    if (workflow_run) {
      // GitHub Actions workflow run event
      await handleGitHubWorkflowRun(workflow_run);
    } else if (head_commit && ref) {
      // Push event
      await handleGitHubPush(ref, head_commit);
    } else if (action === 'opened' || action === 'synchronize') {
      // Pull request event
      await handleGitHubPullRequest(req.body);
    } else {
      logger.info('Unhandled GitHub webhook event type');
    }

    // Always return 200 for webhooks
    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Error processing GitHub webhook:', error);
    // Return 200 even on error to prevent webhook retries
    res.status(200).json({ success: false, message: 'Webhook processing failed' });
  }
});

// POST /api/webhooks/jenkins - Jenkins webhook endpoint
router.post('/jenkins', [
  body('name').isString().withMessage('Build name is required'),
  body('url').isURL().withMessage('Build URL is required'),
  body('build').isObject().withMessage('Build details are required'),
  body('build.number').isInt().withMessage('Build number is required'),
  body('build.status').isString().withMessage('Build status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Jenkins webhook validation failed:', errors.array());
    }

    const { name, url, build } = req.body;
    
    logger.info('Jenkins webhook received:', {
      name,
      build_number: build.number,
      status: build.status
    });

    await handleJenkinsBuild(name, url, build);

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Error processing Jenkins webhook:', error);
    res.status(200).json({ success: false, message: 'Webhook processing failed' });
  }
});

// POST /api/webhooks/gitlab - GitLab CI webhook endpoint
router.post('/gitlab', [
  body('object_kind').isString().withMessage('Object kind is required'),
  body('project').isObject().withMessage('Project details are required'),
  body('commit').optional().isObject(),
  body('builds').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('GitLab webhook validation failed:', errors.array());
    }

    const { object_kind, project, commit, builds } = req.body;
    
    logger.info('GitLab webhook received:', {
      object_kind,
      project_name: project.name,
      has_commit: !!commit,
      builds_count: builds?.length || 0
    });

    if (object_kind === 'pipeline') {
      await handleGitLabPipeline(project, builds);
    } else if (object_kind === 'push') {
      await handleGitLabPush(project, commit);
    } else {
      logger.info('Unhandled GitLab webhook event type:', object_kind);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Error processing GitLab webhook:', error);
    res.status(200).json({ success: false, message: 'Webhook processing failed' });
  }
});

// POST /api/webhooks/azure - Azure DevOps webhook endpoint
router.post('/azure', [
  body('eventType').isString().withMessage('Event type is required'),
  body('resource').isObject().withMessage('Resource details are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Azure DevOps webhook validation failed:', errors.array());
    }

    const { eventType, resource } = req.body;
    
    logger.info('Azure DevOps webhook received:', {
      eventType,
      resource_type: resource.type,
      resource_id: resource.id
    });

    if (eventType === 'ms.vss-pipelines.run-state-changed-event') {
      await handleAzurePipelineRun(resource);
    } else if (eventType === 'git.push') {
      await handleAzureGitPush(resource);
    } else {
      logger.info('Unhandled Azure DevOps webhook event type:', eventType);
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Error processing Azure DevOps webhook:', error);
    res.status(200).json({ success: false, message: 'Webhook processing failed' });
  }
});

// POST /api/webhooks/test - Test webhook endpoint for development
router.post('/test', authenticateToken, [
  body('pipeline_id').isInt().withMessage('Pipeline ID is required'),
  body('event_type').isString().withMessage('Event type is required'),
  body('payload').isObject().withMessage('Payload is required')
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

    const { pipeline_id, event_type, payload } = req.body;
    
    // Check if pipeline exists
    const pipeline = await Pipeline.findByPk(pipeline_id);
    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found'
      });
    }

    logger.info('Test webhook received:', {
      pipeline_id,
      event_type,
      user_id: req.user.id
    });

    // Simulate webhook processing
    const testBuild = await Build.create({
      pipeline_id,
      external_id: `test-${Date.now()}`,
      branch: 'test-branch',
      commit_hash: 'test-commit-hash',
      commit_message: 'Test webhook event',
      author: req.user.username || 'Test User',
      status: 'pending',
      trigger_type: 'webhook',
      environment: 'test',
      started_at: new Date()
    });

    logger.info(`Test build created: ${testBuild.id}`);
    
    res.json({
      success: true,
      message: 'Test webhook processed successfully',
      data: {
        build_id: testBuild.id,
        pipeline_name: pipeline.name,
        event_type
      }
    });
  } catch (error) {
    logger.error('Error processing test webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process test webhook'
    });
  }
});

// Helper functions for processing different webhook types

async function handleGitHubWorkflowRun(workflowRun) {
  try {
    const { id, name, status, conclusion, head_branch, head_sha, created_at, updated_at } = workflowRun;
    
    // Find pipeline by GitHub repository
    const pipeline = await Pipeline.findOne({
      where: {
        type: 'github-actions',
        config: {
          repository: workflowRun.repository.full_name
        }
      }
    });

    if (!pipeline) {
      logger.warn('No pipeline found for GitHub repository:', workflowRun.repository.full_name);
      return;
    }

    // Check if build already exists
    let build = await Build.findOne({
      where: { external_id: id.toString(), pipeline_id: pipeline.id }
    });

    if (build) {
      // Update existing build
      await build.update({
        status: mapGitHubStatus(status, conclusion),
        completed_at: conclusion ? new Date(updated_at) : null,
        duration: conclusion ? 
          Math.floor((new Date(updated_at) - new Date(created_at)) / 1000) : null
      });
      logger.info(`GitHub build updated: ${build.id} - ${build.status}`);
    } else {
      // Create new build
      build = await Build.create({
        pipeline_id: pipeline.id,
        external_id: id.toString(),
        branch: head_branch,
        commit_hash: head_sha,
        commit_message: `GitHub Actions: ${name}`,
        author: workflowRun.actor?.login || 'Unknown',
        status: mapGitHubStatus(status, conclusion),
        trigger_type: 'webhook',
        environment: 'github-actions',
        started_at: new Date(created_at),
        completed_at: conclusion ? new Date(updated_at) : null,
        duration: conclusion ? 
          Math.floor((new Date(updated_at) - new Date(created_at)) / 1000) : null
      });
      logger.info(`GitHub build created: ${build.id}`);
    }

    // TODO: Emit WebSocket event for real-time updates
    // emitBuildStatus(build);
    
  } catch (error) {
    logger.error('Error handling GitHub workflow run:', error);
    throw error;
  }
}

async function handleGitHubPush(ref, headCommit) {
  try {
    const branch = ref.replace('refs/heads/', '');
    const { id, message, author, timestamp } = headCommit;
    
    // Find pipelines for this repository and branch
    const pipelines = await Pipeline.findAll({
      where: {
        type: 'github-actions',
        config: {
          branches: { [require('sequelize').Op.contains]: [branch] }
        }
      }
    });

    for (const pipeline of pipelines) {
      // Create build record for push event
      const build = await Build.create({
        pipeline_id: pipeline.id,
        external_id: `push-${id.substring(0, 8)}`,
        branch,
        commit_hash: id,
        commit_message: message,
        author: author.name || author.username || 'Unknown',
        status: 'pending',
        trigger_type: 'webhook',
        environment: 'github-actions',
        started_at: new Date(timestamp)
      });
      
      logger.info(`GitHub push build created: ${build.id} for pipeline ${pipeline.id}`);
    }
    
  } catch (error) {
    logger.error('Error handling GitHub push:', error);
    throw error;
  }
}

async function handleGitHubPullRequest(payload) {
  try {
    const { action, pull_request, repository } = payload;
    
    if (action !== 'opened' && action !== 'synchronize') {
      return; // Only handle PR open and sync events
    }

    const { head, title, user } = pull_request;
    
    // Find pipelines for this repository
    const pipelines = await Pipeline.findAll({
      where: {
        type: 'github-actions',
        config: {
          repository: repository.full_name
        }
      }
    });

    for (const pipeline of pipelines) {
      // Create build record for PR event
      const build = await Build.create({
        pipeline_id: pipeline.id,
        external_id: `pr-${pull_request.number}`,
        branch: head.ref,
        commit_hash: head.sha,
        commit_message: `PR: ${title}`,
        author: user.login,
        status: 'pending',
        trigger_type: 'webhook',
        environment: 'github-actions',
        started_at: new Date()
      });
      
      logger.info(`GitHub PR build created: ${build.id} for pipeline ${pipeline.id}`);
    }
    
  } catch (error) {
    logger.error('Error handling GitHub pull request:', error);
    throw error;
  }
}

async function handleJenkinsBuild(name, url, buildDetails) {
  try {
    const { number, status, timestamp, duration, result } = buildDetails;
    
    // Find pipeline by Jenkins job name
    const pipeline = await Pipeline.findOne({
      where: {
        type: 'jenkins',
        config: {
          job_name: name
        }
      }
    });

    if (!pipeline) {
      logger.warn('No pipeline found for Jenkins job:', name);
      return;
    }

    // Check if build already exists
    let build = await Build.findOne({
      where: { external_id: number.toString(), pipeline_id: pipeline.id }
    });

    if (build) {
      // Update existing build
      await build.update({
        status: mapJenkinsStatus(status, result),
        completed_at: result ? new Date(parseInt(timestamp) + parseInt(duration)) : null,
        duration: duration ? Math.floor(duration / 1000) : null
      });
      logger.info(`Jenkins build updated: ${build.id} - ${build.status}`);
    } else {
      // Create new build
      build = await Build.create({
        pipeline_id: pipeline.id,
        external_id: number.toString(),
        branch: 'main', // Jenkins doesn't always provide branch info
        commit_hash: `jenkins-${number}`,
        commit_message: `Jenkins build #${number}`,
        author: 'Jenkins',
        status: mapJenkinsStatus(status, result),
        trigger_type: 'webhook',
        environment: 'jenkins',
        started_at: new Date(parseInt(timestamp)),
        completed_at: result ? new Date(parseInt(timestamp) + parseInt(duration)) : null,
        duration: duration ? Math.floor(duration / 1000) : null
      });
      logger.info(`Jenkins build created: ${build.id}`);
    }
    
  } catch (error) {
    logger.error('Error handling Jenkins build:', error);
    throw error;
  }
}

async function handleGitLabPipeline(project, builds) {
  try {
    if (!builds || builds.length === 0) return;
    
    // Find pipeline by GitLab project
    const pipeline = await Pipeline.findOne({
      where: {
        type: 'gitlab-ci',
        config: {
          project_id: project.id.toString()
        }
      }
    });

    if (!pipeline) {
      logger.warn('No pipeline found for GitLab project:', project.name);
      return;
    }

    for (const build of builds) {
      const { id, status, stage, created_at, finished_at, duration } = build;
      
      // Check if build already exists
      let existingBuild = await Build.findOne({
        where: { external_id: id.toString(), pipeline_id: pipeline.id }
      });

      if (existingBuild) {
        // Update existing build
        await existingBuild.update({
          status: mapGitLabStatus(status),
          completed_at: finished_at ? new Date(finished_at) : null,
          duration: duration || null
        });
        logger.info(`GitLab build updated: ${existingBuild.id} - ${existingBuild.status}`);
      } else {
        // Create new build
        existingBuild = await Build.create({
          pipeline_id: pipeline.id,
          external_id: id.toString(),
          branch: build.ref || 'main',
          commit_hash: build.commit?.id || `gitlab-${id}`,
          commit_message: build.commit?.message || `GitLab CI build #${id}`,
          author: build.user?.name || 'GitLab CI',
          status: mapGitLabStatus(status),
          trigger_type: 'webhook',
          environment: 'gitlab-ci',
          started_at: new Date(created_at),
          completed_at: finished_at ? new Date(finished_at) : null,
          duration: duration || null
        });
        logger.info(`GitLab build created: ${existingBuild.id}`);
      }
    }
    
  } catch (error) {
    logger.error('Error handling GitLab pipeline:', error);
    throw error;
  }
}

async function handleGitLabPush(project, commit) {
  try {
    if (!commit) return;
    
    // Find pipelines for this project
    const pipelines = await Pipeline.findAll({
      where: {
        type: 'gitlab-ci',
        config: {
          project_id: project.id.toString()
        }
      }
    });

    for (const pipeline of pipelines) {
      // Create build record for push event
      const build = await Build.create({
        pipeline_id: pipeline.id,
        external_id: `push-${commit.id.substring(0, 8)}`,
        branch: commit.ref || 'main',
        commit_hash: commit.id,
        commit_message: commit.message,
        author: commit.author_name || 'Unknown',
        status: 'pending',
        trigger_type: 'webhook',
        environment: 'gitlab-ci',
        started_at: new Date()
      });
      
      logger.info(`GitLab push build created: ${build.id} for pipeline ${pipeline.id}`);
    }
    
  } catch (error) {
    logger.error('Error handling GitLab push:', error);
    throw error;
  }
}

async function handleAzurePipelineRun(resource) {
  try {
    const { id, name, state, result, startTime, finishTime, sourceVersion, sourceBranch } = resource;
    
    // Find pipeline by Azure DevOps project
    const pipeline = await Pipeline.findOne({
      where: {
        type: 'azure-devops',
        config: {
          project_id: resource.project.id.toString()
        }
      }
    });

    if (!pipeline) {
      logger.warn('No pipeline found for Azure DevOps project:', resource.project.name);
      return;
    }

    // Check if build already exists
    let build = await Build.findOne({
      where: { external_id: id.toString(), pipeline_id: pipeline.id }
    });

    if (build) {
      // Update existing build
      await build.update({
        status: mapAzureStatus(state, result),
        completed_at: finishTime ? new Date(finishTime) : null,
        duration: startTime && finishTime ? 
          Math.floor((new Date(finishTime) - new Date(startTime)) / 1000) : null
      });
      logger.info(`Azure build updated: ${build.id} - ${build.status}`);
    } else {
      // Create new build
      build = await Build.create({
        pipeline_id: pipeline.id,
        external_id: id.toString(),
        branch: sourceBranch?.replace('refs/heads/', '') || 'main',
        commit_hash: sourceVersion || `azure-${id}`,
        commit_message: `Azure DevOps: ${name}`,
        author: 'Azure DevOps',
        status: mapAzureStatus(state, result),
        trigger_type: 'webhook',
        environment: 'azure-devops',
        started_at: startTime ? new Date(startTime) : new Date(),
        completed_at: finishTime ? new Date(finishTime) : null,
        duration: startTime && finishTime ? 
          Math.floor((new Date(finishTime) - new Date(startTime)) / 1000) : null
      });
      logger.info(`Azure build created: ${build.id}`);
    }
    
  } catch (error) {
    logger.error('Error handling Azure pipeline run:', error);
    throw error;
  }
}

async function handleAzureGitPush(resource) {
  try {
    const { commits, refUpdates } = resource;
    
    if (!commits || commits.length === 0) return;
    
    // Find pipelines for this project
    const pipelines = await Pipeline.findAll({
      where: {
        type: 'azure-devops',
        config: {
          project_id: resource.repository.project.id.toString()
        }
      }
    });

    for (const pipeline of pipelines) {
      for (const commit of commits) {
        // Create build record for push event
        const build = await Build.create({
          pipeline_id: pipeline.id,
          external_id: `push-${commit.commitId.substring(0, 8)}`,
          branch: refUpdates?.[0]?.name?.replace('refs/heads/', '') || 'main',
          commit_hash: commit.commitId,
          commit_message: commit.comment,
          author: commit.author.name || 'Unknown',
          status: 'pending',
          trigger_type: 'webhook',
          environment: 'azure-devops',
          started_at: new Date()
        });
        
        logger.info(`Azure push build created: ${build.id} for pipeline ${pipeline.id}`);
      }
    }
    
  } catch (error) {
    logger.error('Error handling Azure git push:', error);
    throw error;
  }
}

// Status mapping functions

function mapGitHubStatus(status, conclusion) {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success': return 'success';
      case 'failure': return 'failed';
      case 'cancelled': return 'cancelled';
      case 'skipped': return 'cancelled';
      default: return 'failed';
    }
  } else if (status === 'in_progress') {
    return 'running';
  } else if (status === 'queued' || status === 'waiting') {
    return 'pending';
  } else {
    return 'pending';
  }
}

function mapJenkinsStatus(status, result) {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILURE') return 'failed';
  if (status === 'ABORTED') return 'cancelled';
  if (status === 'UNSTABLE') return 'failed';
  if (status === 'IN_PROGRESS') return 'running';
  return 'pending';
}

function mapGitLabStatus(status) {
  switch (status) {
    case 'success': return 'success';
    case 'failed': return 'failed';
    case 'canceled': return 'cancelled';
    case 'running': return 'running';
    case 'pending': return 'pending';
    case 'skipped': return 'cancelled';
    default: return 'pending';
  }
}

function mapAzureStatus(state, result) {
  if (state === 'completed') {
    switch (result) {
      case 'succeeded': return 'success';
      case 'failed': return 'failed';
      case 'canceled': return 'cancelled';
      case 'partiallySucceeded': return 'failed';
      default: return 'failed';
    }
  } else if (state === 'inProgress') {
    return 'running';
  } else if (state === 'notStarted' || state === 'postponed') {
    return 'pending';
  } else {
    return 'pending';
  }
}

module.exports = router;
