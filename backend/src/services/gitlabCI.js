const axios = require('axios');
const logger = require('../utils/logger');

class GitLabCIService {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.accessToken = config.accessToken;
    this.timeout = config.timeout || 30000;
    
    // Create axios instance with GitLab API token
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v4`,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('GitLab CI API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method,
          error: error.message
        });
        throw error;
      }
    );
  }

  // Test connection to GitLab
  async testConnection() {
    try {
      const response = await this.client.get('/user');
      return {
        success: true,
        data: {
          user_id: response.data.id,
          username: response.data.username,
          name: response.data.name,
          email: response.data.email
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  // Get all projects accessible to the user
  async getProjects(page = 1, perPage = 20) {
    try {
      const response = await this.client.get('/projects', {
        params: {
          page,
          per_page: perPage,
          order_by: 'last_activity_at',
          sort: 'desc'
        }
      });
      
      const projects = response.data.map(project => ({
        id: project.id,
        name: project.name,
        path: project.path,
        full_path: project.path_with_namespace,
        description: project.description,
        web_url: project.web_url,
        git_ssh_url: project.ssh_url_to_repo,
        git_http_url: project.http_url_to_repo,
        visibility: project.visibility,
        last_activity_at: project.last_activity_at,
        created_at: project.created_at,
        default_branch: project.default_branch
      }));

      return {
        success: true,
        data: projects,
        pagination: {
          page: parseInt(page),
          per_page: parseInt(perPage),
          total: response.headers['x-total'],
          total_pages: response.headers['x-total-pages']
        }
      };
    } catch (error) {
      logger.error('Error fetching GitLab projects:', error);
      throw error;
    }
  }

  // Get specific project details
  async getProject(projectId) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}`);
      
      const project = response.data;
      return {
        success: true,
        data: {
          id: project.id,
          name: project.name,
          path: project.path,
          full_path: project.path_with_namespace,
          description: project.description,
          web_url: project.web_url,
          git_ssh_url: project.ssh_url_to_repo,
          git_http_url: project.http_url_to_repo,
          visibility: project.visibility,
          last_activity_at: project.last_activity_at,
          created_at: project.created_at,
          default_branch: project.default_branch,
          topics: project.topics || [],
          statistics: project.statistics || {}
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab project ${projectId}:`, error);
      throw error;
    }
  }

  // Get project pipelines
  async getProjectPipelines(projectId, page = 1, perPage = 20) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/pipelines`, {
        params: {
          page,
          per_page: perPage,
          order_by: 'updated_at',
          sort: 'desc'
        }
      });
      
      const pipelines = response.data.map(pipeline => ({
        id: pipeline.id,
        project_id: pipeline.project_id,
        status: pipeline.status,
        ref: pipeline.ref,
        sha: pipeline.sha,
        source: pipeline.source,
        created_at: pipeline.created_at,
        updated_at: pipeline.updated_at,
        started_at: pipeline.started_at,
        finished_at: pipeline.finished_at,
        duration: pipeline.duration,
        web_url: pipeline.web_url,
        before_sha: pipeline.before_sha,
        tag: pipeline.tag,
        user: pipeline.user
      }));

      return {
        success: true,
        data: pipelines,
        pagination: {
          page: parseInt(page),
          per_page: parseInt(perPage),
          total: response.headers['x-total'],
          total_pages: response.headers['x-total-pages']
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab project pipelines ${projectId}:`, error);
      throw error;
    }
  }

  // Get specific pipeline details
  async getPipeline(projectId, pipelineId) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}`);
      
      const pipeline = response.data;
      return {
        success: true,
        data: {
          id: pipeline.id,
          project_id: pipeline.project_id,
          status: pipeline.status,
          ref: pipeline.ref,
          sha: pipeline.sha,
          source: pipeline.source,
          created_at: pipeline.created_at,
          updated_at: pipeline.updated_at,
          started_at: pipeline.started_at,
          finished_at: pipeline.finished_at,
          duration: pipeline.duration,
          web_url: pipeline.web_url,
          before_sha: pipeline.before_sha,
          tag: pipeline.tag,
          user: pipeline.user,
          variables: pipeline.variables || []
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab pipeline ${projectId}#${pipelineId}:`, error);
      throw error;
    }
  }

  // Get pipeline jobs
  async getPipelineJobs(projectId, pipelineId) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/jobs`);
      
      const jobs = response.data.map(job => ({
        id: job.id,
        name: job.name,
        stage: job.stage,
        status: job.status,
        ref: job.ref,
        tag: job.tag,
        created_at: job.created_at,
        started_at: job.started_at,
        finished_at: job.finished_at,
        duration: job.duration,
        user: job.user,
        runner: job.runner,
        artifacts: job.artifacts || [],
        web_url: job.web_url,
        allow_failure: job.allow_failure,
        failure_reason: job.failure_reason
      }));

      return {
        success: true,
        data: jobs
      };
    } catch (error) {
      logger.error(`Error fetching GitLab pipeline jobs ${projectId}#${pipelineId}:`, error);
      throw error;
    }
  }

  // Get specific job details
  async getJob(projectId, jobId) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/jobs/${jobId}`);
      
      const job = response.data;
      return {
        success: true,
        data: {
          id: job.id,
          name: job.name,
          stage: job.stage,
          status: job.status,
          ref: job.ref,
          tag: job.tag,
          created_at: job.created_at,
          started_at: job.started_at,
          finished_at: job.finished_at,
          duration: job.duration,
          user: job.user,
          runner: job.runner,
          artifacts: job.artifacts || [],
          web_url: job.web_url,
          allow_failure: job.allow_failure,
          failure_reason: job.failure_reason,
          trace: job.trace || '',
          variables: job.variables || []
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab job ${projectId}#${jobId}:`, error);
      throw error;
    }
  }

  // Get job trace/logs
  async getJobTrace(projectId, jobId) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/trace`);
      
      return {
        success: true,
        data: {
          trace: response.data,
          job_id: jobId,
          project_id: projectId
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab job trace ${projectId}#${jobId}:`, error);
      throw error;
    }
  }

  // Trigger a new pipeline
  async triggerPipeline(projectId, ref, variables = {}) {
    try {
      const payload = {
        ref: ref,
        variables: Object.entries(variables).map(([key, value]) => ({
          key: key,
          value: value
        }))
      };

      const response = await this.client.post(`/projects/${encodeURIComponent(projectId)}/pipeline`, payload);
      
      return {
        success: true,
        data: {
          message: 'Pipeline triggered successfully',
          pipeline: {
            id: response.data.id,
            status: response.data.status,
            ref: response.data.ref,
            sha: response.data.sha,
            web_url: response.data.web_url
          }
        }
      };
    } catch (error) {
      logger.error(`Error triggering GitLab pipeline for project ${projectId}:`, error);
      throw error;
    }
  }

  // Cancel a pipeline
  async cancelPipeline(projectId, pipelineId) {
    try {
      const response = await this.client.post(`/projects/${encodeURIComponent(projectId)}/pipelines/${pipelineId}/cancel`);
      
      return {
        success: true,
        data: {
          message: 'Pipeline cancelled successfully',
          pipeline: {
            id: response.data.id,
            status: response.data.status
          }
        }
      };
    } catch (error) {
      logger.error(`Error cancelling GitLab pipeline ${projectId}#${pipelineId}:`, error);
      throw error;
    }
  }

  // Retry a failed job
  async retryJob(projectId, jobId) {
    try {
      const response = await this.client.post(`/projects/${encodeURIComponent(projectId)}/jobs/${jobId}/retry`);
      
      return {
        success: true,
        data: {
          message: 'Job retry initiated successfully',
          job: {
            id: response.data.id,
            status: response.data.status
          }
        }
      };
    } catch (error) {
      logger.error(`Error retrying GitLab job ${projectId}#${jobId}:`, error);
      throw error;
    }
  }

  // Get project branches
  async getProjectBranches(projectId, page = 1, perPage = 20) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/repository/branches`, {
        params: {
          page,
          per_page: perPage
        }
      });
      
      const branches = response.data.map(branch => ({
        name: branch.name,
        commit: branch.commit,
        protected: branch.protected,
        developers_can_push: branch.developers_can_push,
        developers_can_merge: branch.developers_can_merge
      }));

      return {
        success: true,
        data: branches,
        pagination: {
          page: parseInt(page),
          per_page: parseInt(perPage),
          total: response.headers['x-total'],
          total_pages: response.headers['x-total-pages']
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab project branches ${projectId}:`, error);
      throw error;
    }
  }

  // Get project commits
  async getProjectCommits(projectId, ref = 'main', page = 1, perPage = 20) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/repository/commits`, {
        params: {
          ref_name: ref,
          page,
          per_page: perPage,
          order_by: 'committed_date',
          sort: 'desc'
        }
      });
      
      const commits = response.data.map(commit => ({
        id: commit.id,
        short_id: commit.short_id,
        title: commit.title,
        message: commit.message,
        author_name: commit.author_name,
        author_email: commit.author_email,
        authored_date: commit.authored_date,
        committer_name: commit.committer_name,
        committer_email: commit.committer_email,
        committed_date: commit.committed_date,
        web_url: commit.web_url
      }));

      return {
        success: true,
        data: commits,
        pagination: {
          page: parseInt(page),
          per_page: parseInt(perPage),
          total: response.headers['x-total'],
          total_pages: response.headers['x-total-pages']
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab project commits ${projectId}:`, error);
      throw error;
    }
  }

  // Get project statistics
  async getProjectStatistics(projectId) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/statistics`);
      
      return {
        success: true,
        data: {
          project_id: projectId,
          statistics: response.data
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab project statistics ${projectId}:`, error);
      throw error;
    }
  }

  // Handle webhook event
  async handleWebhookEvent(payload) {
    try {
      const { object_kind, project, pipeline, builds } = payload;
      
      if (!object_kind || !project) {
        throw new Error('Invalid webhook payload: missing object_kind or project information');
      }

      let result = {
        event_type: object_kind,
        project: {
          id: project.id,
          name: project.name,
          path: project.path,
          web_url: project.web_url
        }
      };

      if (object_kind === 'pipeline' && pipeline) {
        result.pipeline = {
          id: pipeline.id,
          status: pipeline.status,
          ref: pipeline.ref,
          sha: pipeline.sha,
          source: pipeline.source,
          created_at: pipeline.created_at,
          updated_at: pipeline.updated_at,
          started_at: pipeline.started_at,
          finished_at: pipeline.finished_at,
          duration: pipeline.duration
        };
      }

      if (builds && builds.length > 0) {
        result.builds = builds.map(build => ({
          id: build.id,
          name: build.name,
          stage: build.stage,
          status: build.status,
          ref: build.ref,
          created_at: build.created_at,
          started_at: build.started_at,
          finished_at: build.finished_at,
          duration: build.duration
        }));
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Error handling GitLab CI webhook event:', error);
      throw error;
    }
  }

  // Utility methods for status mapping
  mapPipelineStatus(gitlabStatus) {
    switch (gitlabStatus) {
      case 'success': return 'success';
      case 'failed': return 'failed';
      case 'canceled': return 'cancelled';
      case 'running': return 'running';
      case 'pending': return 'pending';
      case 'skipped': return 'cancelled';
      case 'manual': return 'pending';
      default: return 'unknown';
    }
  }

  mapJobStatus(gitlabStatus) {
    switch (gitlabStatus) {
      case 'success': return 'success';
      case 'failed': return 'failed';
      case 'canceled': return 'cancelled';
      case 'running': return 'running';
      case 'pending': return 'pending';
      case 'skipped': return 'cancelled';
      case 'manual': return 'pending';
      case 'created': return 'pending';
      case 'preparing': return 'pending';
      case 'scheduled': return 'pending';
      default: return 'unknown';
    }
  }

  // Get project merge requests
  async getProjectMergeRequests(projectId, page = 1, perPage = 20) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(projectId)}/merge_requests`, {
        params: {
          page,
          per_page: perPage,
          order_by: 'updated_at',
          sort: 'desc'
        }
      });
      
      const mergeRequests = response.data.map(mr => ({
        id: mr.id,
        iid: mr.iid,
        title: mr.title,
        description: mr.description,
        state: mr.state,
        merged_at: mr.merged_at,
        closed_at: mr.closed_at,
        created_at: mr.created_at,
        updated_at: mr.updated_at,
        source_branch: mr.source_branch,
        target_branch: mr.target_branch,
        author: mr.author,
        assignee: mr.assignee,
        web_url: mr.web_url
      }));

      return {
        success: true,
        data: mergeRequests,
        pagination: {
          page: parseInt(page),
          per_page: parseInt(perPage),
          total: response.headers['x-total'],
          total_pages: response.headers['x-total-pages']
        }
      };
    } catch (error) {
      logger.error(`Error fetching GitLab project merge requests ${projectId}:`, error);
      throw error;
    }
  }
}

module.exports = GitLabCIService;
