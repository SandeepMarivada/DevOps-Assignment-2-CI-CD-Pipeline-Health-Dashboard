const axios = require('axios');
const { logger } = require('../utils/logger');

class JenkinsService {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.apiToken = config.apiToken;
    this.timeout = config.timeout || 30000;
    
    // Create axios instance with basic auth
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      auth: {
        username: this.username,
        password: this.apiToken
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Jenkins API error:', {
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

  // Test connection to Jenkins
  async testConnection() {
    try {
      const response = await this.client.get('/api/json');
      return {
        success: true,
        data: {
          version: response.data.version,
          url: response.data.url,
          description: response.data.description
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

  // Get all jobs
  async getJobs() {
    try {
      const response = await this.client.get('/api/json?tree=jobs[name,url,color,description,builds[number,url,result,timestamp,duration,executor[*]]]');
      
      const jobs = response.data.jobs.map(job => ({
        name: job.name,
        url: job.url,
        status: this.mapJobColorToStatus(job.color),
        description: job.description,
        builds: job.builds || [], // Get all builds, not just last_build
        last_build: job.builds?.[0] || null,
        build_count: job.builds?.length || 0
      }));

      return {
        success: true,
        data: jobs
      };
    } catch (error) {
      logger.error('Error fetching Jenkins jobs:', error);
      throw error;
    }
  }

  // Get specific job details
  async getJob(jobName) {
    try {
      const response = await this.client.get(`/job/${encodeURIComponent(jobName)}/api/json?tree=name,url,description,color,builds[number,url,result,timestamp,duration,executor[*],actions[*],changeSet[*]]`);
      
      const job = response.data;
      return {
        success: true,
        data: {
          name: job.name,
          url: job.url,
          status: this.mapJobColorToStatus(job.color),
          description: job.description,
          builds: job.builds || [],
          total_builds: job.builds?.length || 0
        }
      };
    } catch (error) {
      logger.error(`Error fetching Jenkins job ${jobName}:`, error);
      throw error;
    }
  }

  // Get build details
  async getBuild(jobName, buildNumber) {
    try {
      const response = await this.client.get(`/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json?tree=number,url,result,timestamp,duration,executor[*],actions[*],changeSet[*],artifacts[*],building,description`);
      
      const build = response.data;
      return {
        success: true,
        data: {
          number: build.number,
          url: build.url,
          status: this.mapBuildResultToStatus(build.result, build.building),
          timestamp: build.timestamp,
          duration: build.duration,
          building: build.building,
          description: build.description,
          executor: build.executor,
          changes: build.changeSet?.items || [],
          artifacts: build.artifacts || []
        }
      };
    } catch (error) {
      logger.error(`Error fetching Jenkins build ${jobName}#${buildNumber}:`, error);
      throw error;
    }
  }

  // Get build console output
  async getBuildConsoleOutput(jobName, buildNumber) {
    try {
      const response = await this.client.get(`/job/${encodeURIComponent(jobName)}/${buildNumber}/consoleText`);
      
      return {
        success: true,
        data: {
          console_output: response.data,
          build_number: buildNumber,
          job_name: jobName
        }
      };
    } catch (error) {
      logger.error(`Error fetching Jenkins build console output ${jobName}#${buildNumber}:`, error);
      throw error;
    }
  }

  // Trigger a build
  async triggerBuild(jobName, parameters = {}) {
    try {
      let url = `/job/${encodeURIComponent(jobName)}/build`;
      
      if (Object.keys(parameters).length > 0) {
        // Build parameterized build URL
        const paramString = Object.entries(parameters)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        url = `/job/${encodeURIComponent(jobName)}/buildWithParameters?${paramString}`;
      }

      const response = await this.client.post(url);
      
      return {
        success: true,
        data: {
          message: 'Build triggered successfully',
          job_name: jobName,
          parameters: parameters,
          queue_url: response.headers?.location || null
        }
      };
    } catch (error) {
      logger.error(`Error triggering Jenkins build for ${jobName}:`, error);
      throw error;
    }
  }

  // Get build queue
  async getBuildQueue() {
    try {
      const response = await this.client.get('/queue/api/json?tree=items[id,url,why,blocked,stuck,executable[*],task[name,url]]');
      
      const queue = response.data.items.map(item => ({
        id: item.id,
        url: item.url,
        why: item.why,
        blocked: item.blocked,
        stuck: item.stuck,
        executable: item.executable,
        task: item.task
      }));

      return {
        success: true,
        data: queue
      };
    } catch (error) {
      logger.error('Error fetching Jenkins build queue:', error);
      throw error;
    }
  }

  // Get node information
  async getNodes() {
    try {
      const response = await this.client.get('/computer/api/json?tree=computer[displayName,description,offline,executors[*],monitorData[*]]');
      
      const nodes = response.data.computer.map(node => ({
        name: node.displayName,
        description: node.description,
        offline: node.offline,
        executors: node.executors || [],
        monitor_data: node.monitorData || {}
      }));

      return {
        success: true,
        data: nodes
      };
    } catch (error) {
      logger.error('Error fetching Jenkins nodes:', error);
      throw error;
    }
  }

  // Get job statistics
  async getJobStatistics(jobName, days = 30) {
    try {
      const response = await this.client.get(`/job/${encodeURIComponent(jobName)}/api/json?tree=builds[number,result,timestamp,duration]`);
      
      const builds = response.data.builds || [];
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      const recentBuilds = builds.filter(build => build.timestamp > cutoffTime);
      
      const statistics = {
        total_builds: recentBuilds.length,
        successful_builds: recentBuilds.filter(b => b.result === 'SUCCESS').length,
        failed_builds: recentBuilds.filter(b => b.result === 'FAILURE').length,
        aborted_builds: recentBuilds.filter(b => b.result === 'ABORTED').length,
        unstable_builds: recentBuilds.filter(b => b.result === 'UNSTABLE').length,
        success_rate: recentBuilds.length > 0 ? 
          (recentBuilds.filter(b => b.result === 'SUCCESS').length / recentBuilds.length) * 100 : 0,
        average_duration: recentBuilds.length > 0 ? 
          recentBuilds.reduce((sum, b) => sum + (b.duration || 0), 0) / recentBuilds.length : 0
      };

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      logger.error(`Error fetching Jenkins job statistics for ${jobName}:`, error);
      throw error;
    }
  }

  // Get plugin information
  async getPlugins() {
    try {
      const response = await this.client.get('/pluginManager/api/json?tree=plugins[shortName,longName,version,enabled]');
      
      const plugins = response.data.plugins.map(plugin => ({
        short_name: plugin.shortName,
        long_name: plugin.longName,
        version: plugin.version,
        enabled: plugin.enabled
      }));

      return {
        success: true,
        data: plugins
      };
    } catch (error) {
      logger.error('Error fetching Jenkins plugins:', error);
      throw error;
    }
  }

  // Handle webhook event
  async handleWebhookEvent(payload) {
    try {
      const { name, url, build } = payload;
      
      if (!name || !build) {
        throw new Error('Invalid webhook payload: missing name or build information');
      }

      // Get detailed build information
      const buildDetails = await this.getBuild(name, build.number);
      
      return {
        success: true,
        data: {
          job_name: name,
          build: buildDetails.data,
          webhook_payload: payload
        }
      };
    } catch (error) {
      logger.error('Error handling Jenkins webhook event:', error);
      throw error;
    }
  }

  // Utility methods for status mapping
  mapJobColorToStatus(color) {
    if (!color) return 'unknown';
    
    if (color.includes('blue')) return 'success';
    if (color.includes('red')) return 'failed';
    if (color.includes('yellow')) return 'unstable';
    if (color.includes('grey')) return 'disabled';
    if (color.includes('aborted')) return 'aborted';
    if (color.includes('nobuilt')) return 'not_built';
    
    return 'unknown';
  }

  mapBuildResultToStatus(result, building) {
    if (building) return 'running';
    if (!result) return 'unknown';
    
    switch (result) {
      case 'SUCCESS': return 'success';
      case 'FAILURE': return 'failed';
      case 'ABORTED': return 'cancelled';
      case 'UNSTABLE': return 'failed';
      case 'NOT_BUILT': return 'not_built';
      default: return 'unknown';
    }
  }

  // Get build artifacts
  async getBuildArtifacts(jobName, buildNumber) {
    try {
      const response = await this.client.get(`/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json?tree=artifacts[*]`);
      
      return {
        success: true,
        data: {
          artifacts: response.data.artifacts || [],
          build_number: buildNumber,
          job_name: jobName
        }
      };
    } catch (error) {
      logger.error(`Error fetching Jenkins build artifacts ${jobName}#${buildNumber}:`, error);
      throw error;
    }
  }

  // Download artifact
  async downloadArtifact(jobName, buildNumber, artifactPath) {
    try {
      const response = await this.client.get(`/job/${encodeURIComponent(jobName)}/${buildNumber}/artifact/${artifactPath}`, {
        responseType: 'stream'
      });
      
      return {
        success: true,
        data: {
          stream: response.data,
          content_type: response.headers['content-type'],
          content_length: response.headers['content-length'],
          filename: artifactPath.split('/').pop()
        }
      };
    } catch (error) {
      logger.error(`Error downloading Jenkins artifact ${jobName}#${buildNumber}:${artifactPath}:`, error);
      throw error;
    }
  }

  // Get build changes
  async getBuildChanges(jobName, buildNumber) {
    try {
      const response = await this.client.get(`/job/${encodeURIComponent(jobName)}/${buildNumber}/api/json?tree=changeSet[items[*]]`);
      
      const changes = response.data.changeSet?.items || [];
      
      return {
        success: true,
        data: {
          changes: changes.map(change => ({
            commit_id: change.commitId,
            author: change.author?.fullName || change.author?.id || 'Unknown',
            message: change.msg,
            timestamp: change.timestamp,
            affected_files: change.affectedPaths || [],
            added_lines: change.addedLines || 0,
            deleted_lines: change.deletedLines || 0
          })),
          build_number: buildNumber,
          job_name: jobName
        }
      };
    } catch (error) {
      logger.error(`Error fetching Jenkins build changes ${jobName}#${buildNumber}:`, error);
      throw error;
    }
  }
}

module.exports = JenkinsService;
