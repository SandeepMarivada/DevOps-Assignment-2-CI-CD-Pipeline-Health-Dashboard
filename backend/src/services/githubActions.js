const axios = require('axios');
const { logger } = require('../utils/logger');
const { emitBuildStatus } = require('../websocket/socket');

class GitHubActionsService {
  constructor(token, baseURL = 'https://api.github.com') {
    this.token = token;
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CI-CD-Dashboard/1.0.0'
      }
    });
  }

  // Fetch workflow runs for a repository
  async getWorkflowRuns(owner, repo, options = {}) {
    try {
      const params = {
        per_page: options.per_page || 30,
        page: options.page || 1
      };

      if (options.branch) {
        params.branch = options.branch;
      }

      if (options.status) {
        params.status = options.status;
      }

      const response = await this.client.get(`/repos/${owner}/${repo}/actions/runs`, { params });
      
      logger.info(`Fetched ${response.data.workflow_runs.length} workflow runs for ${owner}/${repo}`);
      
      return response.data.workflow_runs.map(run => this.transformWorkflowRun(run, owner, repo));
    } catch (error) {
      logger.error(`Error fetching workflow runs for ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  // Fetch a specific workflow run
  async getWorkflowRun(owner, repo, runId) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/actions/runs/${runId}`);
      
      logger.info(`Fetched workflow run ${runId} for ${owner}/${repo}`);
      
      return this.transformWorkflowRun(response.data, owner, repo);
    } catch (error) {
      logger.error(`Error fetching workflow run ${runId} for ${owner}/${repo}:`, error.message);
      throw error;
    }
    }

  // Fetch workflow run logs
  async getWorkflowRunLogs(owner, repo, runId) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/actions/runs/${runId}/logs`);
      
      logger.info(`Fetched logs for workflow run ${runId} for ${owner}/${repo}`);
      
      return response.data;
    } catch (error) {
      logger.error(`Error fetching logs for workflow run ${runId} for ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  // Fetch workflows for a repository
  async getWorkflows(owner, repo) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/actions/workflows`);
      
      logger.info(`Fetched ${response.data.workflows.length} workflows for ${owner}/${repo}`);
      
      return response.data.workflows;
    } catch (error) {
      logger.error(`Error fetching workflows for ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  // Trigger a workflow run
  async triggerWorkflow(owner, repo, workflowId, ref, inputs = {}) {
    try {
      const payload = {
        ref,
        inputs
      };

      const response = await this.client.post(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, payload);
      
      logger.info(`Triggered workflow ${workflowId} for ${owner}/${repo} on ${ref}`);
      
      return response.status === 204; // GitHub returns 204 on success
    } catch (error) {
      logger.error(`Error triggering workflow ${workflowId} for ${owner}/${repo}:`, error.message);
      throw error;
    }
  }

  // Handle webhook events
  async handleWebhookEvent(event, payload) {
    try {
      logger.info(`Processing GitHub webhook event: ${event}`);

      switch (event) {
        case 'workflow_run':
          return await this.handleWorkflowRunEvent(payload);
        case 'push':
          return await this.handlePushEvent(payload);
        case 'pull_request':
          return await this.handlePullRequestEvent(payload);
        default:
          logger.info(`Unhandled webhook event: ${event}`);
          return null;
      }
    } catch (error) {
      logger.error(`Error handling webhook event ${event}:`, error);
      throw error;
    }
  }

  // Handle workflow_run webhook event
  async handleWorkflowRunEvent(payload) {
    const { workflow_run, repository } = payload;
    
    const buildData = {
      external_id: workflow_run.id.toString(),
      status: this.mapGitHubStatus(workflow_run.conclusion || workflow_run.status),
      branch: workflow_run.head_branch,
      commit_hash: workflow_run.head_sha,
      commit_message: workflow_run.head_commit?.message || 'No commit message',
      author: workflow_run.head_commit?.author?.name || 'Unknown',
      started_at: workflow_run.run_started_at,
      completed_at: workflow_run.updated_at,
      duration: workflow_run.run_duration_ms,
      trigger_type: this.mapTriggerType(workflow_run.event),
      artifacts: {
        workflow_name: workflow_run.name,
        workflow_id: workflow_run.workflow_id,
        run_number: workflow_run.run_number,
        html_url: workflow_run.html_url
      }
    };

    // Emit real-time update
    emitBuildStatus(buildData);

    return buildData;
  }

  // Handle push webhook event
  async handlePushEvent(payload) {
    const { ref, commits, repository } = payload;
    
    logger.info(`Push event for ${repository.full_name} on ${ref}`);
    
    // You might want to trigger workflows or update pipeline status here
    return {
      type: 'push',
      repository: repository.full_name,
      branch: ref.replace('refs/heads/', ''),
      commits: commits.length
    };
  }

  // Handle pull_request webhook event
  async handlePullRequestEvent(payload) {
    const { action, pull_request, repository } = payload;
    
    logger.info(`Pull request ${action} for ${repository.full_name} #${pull_request.number}`);
    
    return {
      type: 'pull_request',
      action,
      repository: repository.full_name,
      pr_number: pull_request.number,
      branch: pull_request.head.ref
    };
  }

  // Transform GitHub workflow run to our format
  transformWorkflowRun(run, owner, repo) {
    return {
      id: run.id,
      name: run.name,
      status: this.mapGitHubStatus(run.conclusion || run.status),
      branch: run.head_branch,
      commit_hash: run.head_sha,
      commit_message: run.head_commit?.message || 'No commit message',
      author: run.head_commit?.author?.name || 'Unknown',
      started_at: run.run_started_at,
      completed_at: run.updated_at,
      duration: run.run_duration_ms,
      trigger_type: this.mapTriggerType(run.event),
      repository: `${owner}/${repo}`,
      workflow_id: run.workflow_id,
      run_number: run.run_number,
      html_url: run.html_url,
      artifacts: {
        workflow_name: run.name,
        workflow_id: run.workflow_id,
        run_number: run.run_number
      }
    };
  }

  // Map GitHub status to our status format
  mapGitHubStatus(githubStatus) {
    const statusMap = {
      'success': 'success',
      'failure': 'failed',
      'cancelled': 'cancelled',
      'skipped': 'skipped',
      'in_progress': 'running',
      'queued': 'pending',
      'waiting': 'pending',
      'requested': 'pending'
    };

    return statusMap[githubStatus] || 'unknown';
  }

  // Map GitHub trigger type to our format
  mapTriggerType(githubEvent) {
    const eventMap = {
      'push': 'push',
      'pull_request': 'pull_request',
      'workflow_dispatch': 'manual',
      'schedule': 'scheduled',
      'repository_dispatch': 'webhook'
    };

    return eventMap[githubEvent] || 'webhook';
  }

  // Check API rate limits
  async checkRateLimit() {
    try {
      const response = await this.client.get('/rate_limit');
      return response.data.resources.core;
    } catch (error) {
      logger.error('Error checking rate limit:', error.message);
      return null;
    }
  }

  // Validate webhook signature
  validateWebhookSignature(payload, signature, secret) {
    const crypto = require('crypto');
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = GitHubActionsService;
