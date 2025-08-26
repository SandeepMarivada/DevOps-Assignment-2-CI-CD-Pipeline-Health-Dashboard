const axios = require('axios');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class AlertNotificationService {
  constructor(config) {
    this.config = config;
    this.slackWebhookUrl = config.slack?.webhookUrl;
    this.emailConfig = config.email;
    
    // Initialize email transporter if configured
    if (this.emailConfig) {
      this.emailTransporter = nodemailer.createTransporter({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure || false,
        auth: {
          user: this.emailConfig.user,
          pass: this.emailConfig.password
        }
      });
    }
  }

  // Send notification through multiple channels
  async sendNotification(alert, build, channels = []) {
    const results = {};
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'slack':
            results.slack = await this.sendSlackNotification(alert, build);
            break;
          case 'email':
            results.email = await this.sendEmailNotification(alert, build);
            break;
          case 'webhook':
            results.webhook = await this.sendWebhookNotification(alert, build);
            break;
          default:
            logger.warn(`Unknown notification channel: ${channel}`);
            results[channel] = { success: false, error: 'Unknown channel' };
        }
      } catch (error) {
        logger.error(`Error sending ${channel} notification:`, error);
        results[channel] = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  // Send Slack notification
  async sendSlackNotification(alert, build) {
    if (!this.slackWebhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const message = this.formatSlackMessage(alert, build);
    
    try {
      const response = await axios.post(this.slackWebhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.status === 200) {
        logger.info(`Slack notification sent successfully for alert ${alert.id}`);
        return { success: true, message_id: response.data?.ts };
      } else {
        throw new Error(`Slack API returned status ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
      throw error;
    }
  }

  // Send Email notification
  async sendEmailNotification(alert, build) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    const emailContent = this.formatEmailMessage(alert, build);
    
    try {
      const result = await this.emailTransporter.sendMail({
        from: this.emailConfig.from,
        to: this.emailConfig.to,
        cc: this.emailConfig.cc,
        bcc: this.emailConfig.bcc,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      });

      logger.info(`Email notification sent successfully for alert ${alert.id}`);
      return { success: true, message_id: result.messageId };
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }

  // Send Webhook notification
  async sendWebhookNotification(alert, build) {
    if (!this.config.webhook?.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = this.formatWebhookPayload(alert, build);
    
    try {
      const response = await axios.post(this.config.webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.webhook.headers || {})
        },
        timeout: 10000
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`Webhook notification sent successfully for alert ${alert.id}`);
        return { success: true, response_data: response.data };
      } else {
        throw new Error(`Webhook returned status ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook notification:', error);
      throw error;
    }
  }

  // Format Slack message
  formatSlackMessage(alert, build) {
    const severityColors = {
      'low': '#36a64f',
      'medium': '#ffa500',
      'high': '#ff8c00',
      'critical': '#ff0000'
    };

    const statusEmojis = {
      'success': ':white_check_mark:',
      'failed': ':x:',
      'running': ':running:',
      'pending': ':clock1:',
      'cancelled': ':no_entry:'
    };

    const buildStatus = build ? statusEmojis[build.status] || ':question:' : ':question:';
    const severityColor = severityColors[alert.severity] || '#808080';

    const message = {
      attachments: [{
        color: severityColor,
        title: `🚨 Alert: ${alert.name}`,
        text: alert.description || 'Pipeline alert triggered',
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Pipeline',
            value: build?.pipeline?.name || 'Unknown',
            short: true
          },
          {
            title: 'Build Status',
            value: `${buildStatus} ${build?.status || 'Unknown'}`,
            short: true
          },
          {
            title: 'Condition',
            value: alert.getConditionDescription(),
            short: true
          }
        ],
        footer: 'CI/CD Pipeline Health Dashboard',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    // Add build details if available
    if (build) {
      message.attachments[0].fields.push(
        {
          title: 'Build ID',
          value: build.external_id || build.id,
          short: true
        },
        {
          title: 'Branch',
          value: build.branch || 'Unknown',
          short: true
        },
        {
          title: 'Commit',
          value: build.commit_hash ? build.commit_hash.substring(0, 8) : 'Unknown',
          short: true
        },
        {
          title: 'Author',
          value: build.author || 'Unknown',
          short: true
        }
      );

      if (build.duration) {
        message.attachments[0].fields.push({
          title: 'Duration',
          value: `${Math.floor(build.duration / 60)}m ${build.duration % 60}s`,
          short: true
        });
      }

      if (build.failure_reason) {
        message.attachments[0].fields.push({
          title: 'Failure Reason',
          value: build.failure_reason,
          short: false
        });
      }
    }

    // Add action buttons
    message.attachments[0].actions = [
      {
        type: 'button',
        text: 'View Dashboard',
        url: `${this.config.dashboardUrl}/pipelines/${build?.pipeline_id || alert.pipeline_id}`,
        style: 'primary'
      }
    ];

    if (build) {
      message.attachments[0].actions.push({
        type: 'button',
        text: 'View Build',
        url: build.web_url || `${this.config.dashboardUrl}/builds/${build.id}`,
        style: 'default'
      });
    }

    return message;
  }

  // Format Email message
  formatEmailMessage(alert, build) {
    const severityLabels = {
      'low': 'Low Priority',
      'medium': 'Medium Priority',
      'high': 'High Priority',
      'critical': 'Critical Priority'
    };

    const subject = `[${severityLabels[alert.severity]}] Pipeline Alert: ${alert.name}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .alert-header { background-color: #f8f9fa; padding: 20px; border-left: 4px solid #dc3545; }
          .alert-title { color: #dc3545; font-size: 24px; margin: 0 0 10px 0; }
          .alert-description { margin: 0; }
          .details-section { margin: 20px 0; }
          .detail-row { display: flex; margin: 10px 0; }
          .detail-label { font-weight: bold; width: 150px; }
          .detail-value { flex: 1; }
          .build-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .button:hover { background-color: #0056b3; }
        </style>
      </head>
      <body>
        <div class="alert-header">
          <h1 class="alert-title">🚨 Pipeline Alert</h1>
          <p class="alert-description">${alert.description || 'A pipeline alert has been triggered'}</p>
        </div>

        <div class="details-section">
          <h2>Alert Details</h2>
          <div class="detail-row">
            <div class="detail-label">Alert Name:</div>
            <div class="detail-value">${alert.name}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Severity:</div>
            <div class="detail-value">${alert.severity.toUpperCase()}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Condition:</div>
            <div class="detail-value">${alert.getConditionDescription()}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Triggered At:</div>
            <div class="detail-value">${new Date().toLocaleString()}</div>
          </div>
        </div>

        ${build ? `
        <div class="build-details">
          <h2>Build Information</h2>
          <div class="detail-row">
            <div class="detail-label">Build ID:</div>
            <div class="detail-value">${build.external_id || build.id}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">${build.status}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Branch:</div>
            <div class="detail-value">${build.branch || 'Unknown'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Commit:</div>
            <div class="detail-value">${build.commit_hash || 'Unknown'}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Author:</div>
            <div class="detail-value">${build.author || 'Unknown'}</div>
          </div>
          ${build.duration ? `
          <div class="detail-row">
            <div class="detail-label">Duration:</div>
            <div class="detail-value">${Math.floor(build.duration / 60)}m ${build.duration % 60}s</div>
          </div>
          ` : ''}
          ${build.failure_reason ? `
          <div class="detail-row">
            <div class="detail-label">Failure Reason:</div>
            <div class="detail-value">${build.failure_reason}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="details-section">
          <h2>Actions</h2>
          <a href="${this.config.dashboardUrl}/pipelines/${build?.pipeline_id || alert.pipeline_id}" class="button">View Dashboard</a>
          ${build ? `<a href="${build.web_url || `${this.config.dashboardUrl}/builds/${build.id}`}" class="button">View Build</a>` : ''}
        </div>

        <div class="footer">
          <p>This alert was sent by the CI/CD Pipeline Health Dashboard.</p>
          <p>To manage your alert preferences, visit the dashboard settings.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Pipeline Alert: ${alert.name}

Severity: ${alert.severity.toUpperCase()}
Description: ${alert.description || 'A pipeline alert has been triggered'}
Condition: ${alert.getConditionDescription()}
Triggered At: ${new Date().toLocaleString()}

${build ? `
Build Information:
- Build ID: ${build.external_id || build.id}
- Status: ${build.status}
- Branch: ${build.branch || 'Unknown'}
- Commit: ${build.commit_hash || 'Unknown'}
- Author: ${build.author || 'Unknown'}
${build.duration ? `- Duration: ${Math.floor(build.duration / 60)}m ${build.duration % 60}s` : ''}
${build.failure_reason ? `- Failure Reason: ${build.failure_reason}` : ''}
` : ''}

Actions:
- View Dashboard: ${this.config.dashboardUrl}/pipelines/${build?.pipeline_id || alert.pipeline_id}
${build ? `- View Build: ${build.web_url || `${this.config.dashboardUrl}/builds/${build.id}`}` : ''}

This alert was sent by the CI/CD Pipeline Health Dashboard.
To manage your alert preferences, visit the dashboard settings.
    `;

    return { subject, html, text };
  }

  // Format Webhook payload
  formatWebhookPayload(alert, build) {
    return {
      alert: {
        id: alert.id,
        name: alert.name,
        description: alert.description,
        severity: alert.severity,
        condition_type: alert.condition_type,
        threshold: alert.threshold,
        operator: alert.operator,
        triggered_at: new Date().toISOString()
      },
      pipeline: build?.pipeline ? {
        id: build.pipeline.id,
        name: build.pipeline.name,
        type: build.pipeline.type,
        team: build.pipeline.team
      } : null,
      build: build ? {
        id: build.id,
        external_id: build.external_id,
        status: build.status,
        branch: build.branch,
        commit_hash: build.commit_hash,
        commit_message: build.commit_message,
        author: build.author,
        started_at: build.started_at,
        completed_at: build.completed_at,
        duration: build.duration,
        failure_reason: build.failure_reason
      } : null,
      metadata: {
        dashboard_url: this.config.dashboardUrl,
        timestamp: new Date().toISOString(),
        notification_id: `alert_${alert.id}_${Date.now()}`
      }
    };
  }

  // Test notification channels
  async testChannels(channels = ['slack', 'email']) {
    const testAlert = {
      id: 'test',
      name: 'Test Alert',
      description: 'This is a test alert to verify notification channels',
      severity: 'medium',
      condition_type: 'success_rate',
      threshold: 95,
      operator: '<',
      getConditionDescription: () => 'Success Rate < 95%'
    };

    const testBuild = {
      id: 'test-build',
      external_id: 'test-123',
      status: 'failed',
      branch: 'main',
      commit_hash: 'abc12345',
      commit_message: 'Test commit message',
      author: 'Test User',
      started_at: new Date(),
      completed_at: new Date(),
      duration: 120,
      failure_reason: 'Test failure reason',
      pipeline: {
        id: 1,
        name: 'Test Pipeline',
        type: 'github-actions',
        team: 'Test Team'
      }
    };

    const results = {};
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'slack':
            results.slack = await this.sendSlackNotification(testAlert, testBuild);
            break;
          case 'email':
            results.email = await this.sendEmailNotification(testAlert, testBuild);
            break;
          case 'webhook':
            results.webhook = await this.sendWebhookNotification(testAlert, testBuild);
            break;
          default:
            results[channel] = { success: false, error: 'Unknown channel' };
        }
      } catch (error) {
        results[channel] = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  // Get notification channel status
  getChannelStatus() {
    return {
      slack: {
        configured: !!this.slackWebhookUrl,
        webhook_url: this.slackWebhookUrl ? 'Configured' : 'Not configured'
      },
      email: {
        configured: !!this.emailTransporter,
        host: this.emailConfig?.host || 'Not configured',
        port: this.emailConfig?.port || 'Not configured',
        user: this.emailConfig?.user || 'Not configured'
      },
      webhook: {
        configured: !!this.config.webhook?.url,
        url: this.config.webhook?.url || 'Not configured'
      }
    };
  }
}

module.exports = AlertNotificationService;
