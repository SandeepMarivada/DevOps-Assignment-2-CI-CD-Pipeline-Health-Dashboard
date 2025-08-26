const { logger } = require('../utils/logger');
const EmailService = require('./emailService');

class SimpleAlertService {
  constructor() {
    this.notifications = [];
    this.emailService = new EmailService();
  }

  // Send alert for build status change
  async sendBuildAlert(build, pipeline, status) {
    try {
      const message = this.formatBuildMessage(build, pipeline, status);
      const alert = {
        id: Date.now(),
        timestamp: new Date(),
        type: 'build_status',
        severity: status === 'failed' ? 'high' : 'medium',
        message: message,
        build_id: build.id,
        pipeline_id: pipeline.id,
        status: status
      };

      // Store notification
      this.notifications.push(alert);

      // Log the alert
      logger.info(`Build Alert: ${message}`);

      // Send email alert
      try {
        const emailResult = await this.emailService.sendAlertEmail(alert);
        if (emailResult.success) {
          logger.info(`Email alert sent successfully: ${emailResult.messageId}`);
          logger.info(`Preview URL: ${emailResult.previewURL}`);
        } else {
          logger.warn(`Email alert failed: ${emailResult.message || emailResult.error}`);
        }
      } catch (emailError) {
        logger.error('Error sending email alert:', emailError);
      }

      // Log the alert
      if (status === 'failed') {
        logger.warn(`🚨 BUILD FAILED: Pipeline ${pipeline.name} - Build #${build.build_number}`);
      } else if (status === 'success') {
        logger.info(`✅ BUILD SUCCESS: Pipeline ${pipeline.name} - Build #${build.build_number}`);
      }

      return alert;
    } catch (error) {
      logger.error('Error sending build alert:', error);
      throw error;
    }
  }

  // Format build message
  formatBuildMessage(build, pipeline, status) {
    const emoji = status === 'failed' ? '🚨' : status === 'success' ? '✅' : '⚠️';
    const statusText = status.toUpperCase();
    
    return `${emoji} Build ${statusText}: Pipeline "${pipeline.name}" - Build #${build.build_number} - ${new Date().toLocaleString()}`;
  }

  // Get all notifications
  getNotifications(limit = 50) {
    return this.notifications
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Get notifications by type
  getNotificationsByType(type) {
    return this.notifications.filter(n => n.type === type);
  }

  // Clear old notifications
  clearOldNotifications(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    this.notifications = this.notifications.filter(n => new Date(n.timestamp) > cutoff);
  }

  // Send test email
  async sendTestEmail(recipients = []) {
    try {
      const result = await this.emailService.sendTestEmail(recipients);
      return result;
    } catch (error) {
      logger.error('Error sending test email:', error);
      throw error;
    }
  }

  // Get email service info
  getEmailServiceInfo() {
    return this.emailService.getTestAccountInfo();
  }

  // Create alerts for existing failed Jenkins builds
  async createAlertsForExistingBuilds(builds, pipelines) {
    try {
      const failedBuilds = builds.filter(build => build.status === 'failed');
      
      for (const build of failedBuilds) {
        const pipeline = pipelines.find(p => p.id === build.pipeline_id);
        if (pipeline) {
          await this.sendBuildAlert(build, pipeline, 'failed');
          logger.info(`Created alert for existing failed build: ${pipeline.name} #${build.build_number}`);
        }
      }
      
      return {
        success: true,
        message: `Created alerts for ${failedBuilds.length} failed builds`,
        count: failedBuilds.length
      };
    } catch (error) {
      logger.error('Error creating alerts for existing builds:', error);
      throw error;
    }
  }
}

module.exports = SimpleAlertService;
