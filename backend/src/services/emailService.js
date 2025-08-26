const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

class EmailService {
  constructor() {
    // Create a test account using Ethereal Email (for development/testing)
    this.transporter = null;
    this.testAccount = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // For development, use Ethereal Email (fake SMTP service)
      this.testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass,
        },
      });

      logger.info('Email service initialized with Ethereal Email');
      logger.info(`Test account created: ${this.testAccount.user}`);
      
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      // Fallback to console logging
      this.transporter = null;
    }
  }

  async sendAlertEmail(alert, recipients = []) {
    try {
      if (!this.transporter) {
        logger.warn('Email service not available, logging alert instead');
        this.logAlertToConsole(alert);
        return { success: false, message: 'Email service not available' };
      }

      // Default recipients if none provided
      if (recipients.length === 0) {
        recipients = ['sandeep.marivada@talentica.com'];
      }

      const mailOptions = {
        from: `"CI/CD Dashboard" <${this.testAccount?.user || 'noreply@cicd-dashboard.com'}>`,
        to: recipients.join(', '),
        subject: `🚨 CI/CD Alert: ${alert.type.toUpperCase()}`,
        html: this.formatAlertEmail(alert),
        text: this.formatAlertEmailText(alert),
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Alert email sent successfully:', {
        messageId: info.messageId,
        previewURL: nodemailer.getTestMessageUrl(info),
        recipients: recipients
      });

      return {
        success: true,
        messageId: info.messageId,
        previewURL: nodemailer.getTestMessageUrl(info),
        recipients: recipients
      };

    } catch (error) {
      logger.error('Failed to send alert email:', error);
      // Fallback to console logging
      this.logAlertToConsole(alert);
      return { success: false, error: error.message };
    }
  }

  formatAlertEmail(alert) {
    const severityColor = this.getSeverityColor(alert.severity);
    const statusEmoji = this.getStatusEmoji(alert.status);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: ${severityColor}; color: white; padding: 15px; border-radius: 5px; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px; }
          .alert-details { background-color: white; padding: 15px; border-radius: 5px; margin-top: 15px; }
          .severity-badge { display: inline-block; padding: 5px 10px; border-radius: 15px; color: white; font-weight: bold; }
          .timestamp { color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${statusEmoji} CI/CD Pipeline Alert</h1>
          <p><strong>Type:</strong> ${alert.type.replace('_', ' ').toUpperCase()}</p>
        </div>
        
        <div class="content">
          <h2>Alert Details</h2>
          <div class="alert-details">
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Severity:</strong> <span class="severity-badge" style="background-color: ${severityColor};">${alert.severity.toUpperCase()}</span></p>
            <p><strong>Build ID:</strong> ${alert.build_id || 'N/A'}</p>
            <p><strong>Pipeline ID:</strong> ${alert.pipeline_id || 'N/A'}</p>
            <p class="timestamp"><strong>Timestamp:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
          </div>
          
          <p style="margin-top: 20px; color: #666;">
            This is an automated alert from your CI/CD Dashboard. 
            Please investigate the pipeline issue and take appropriate action.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  formatAlertEmailText(alert) {
    const statusEmoji = this.getStatusEmoji(alert.status);
    
    return `
CI/CD Pipeline Alert
====================

${statusEmoji} ${alert.message}

Type: ${alert.type.replace('_', ' ').toUpperCase()}
Severity: ${alert.severity.toUpperCase()}
Build ID: ${alert.build_id || 'N/A'}
Pipeline ID: ${alert.pipeline_id || 'N/A'}
Timestamp: ${new Date(alert.timestamp).toLocaleString()}

This is an automated alert from your CI/CD Dashboard. 
Please investigate the pipeline issue and take appropriate action.
    `;
  }

  getSeverityColor(severity) {
    switch (severity) {
      case 'critical':
      case 'high':
        return '#d32f2f'; // Red
      case 'medium':
        return '#f57c00'; // Orange
      case 'low':
        return '#388e3c'; // Green
      default:
        return '#1976d2'; // Blue
    }
  }

  getStatusEmoji(status) {
    switch (status) {
      case 'failed':
        return '🚨';
      case 'success':
        return '✅';
      case 'pending':
        return '⏳';
      default:
        return '⚠️';
    }
  }

  logAlertToConsole(alert) {
    const statusEmoji = this.getStatusEmoji(alert.status);
    const severityColor = this.getSeverityColor(alert.severity);
    
    console.log('\n' + '='.repeat(60));
    console.log(`${statusEmoji} CI/CD ALERT - ${alert.type.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log(`Message: ${alert.message}`);
    console.log(`Severity: ${alert.severity.toUpperCase()}`);
    console.log(`Build ID: ${alert.build_id || 'N/A'}`);
    console.log(`Pipeline ID: ${alert.pipeline_id || 'N/A'}`);
    console.log(`Timestamp: ${new Date(alert.timestamp).toLocaleString()}`);
    console.log('='.repeat(60) + '\n');
  }

  // Test email functionality
  async sendTestEmail(recipients = []) {
    const testAlert = {
      type: 'test_alert',
      severity: 'medium',
      message: 'This is a test alert to verify email functionality',
      build_id: 'test-build-123',
      pipeline_id: 'test-pipeline-456',
      status: 'pending',
      timestamp: new Date()
    };

    return await this.sendAlertEmail(testAlert, recipients);
  }

  // Get test account info for debugging
  getTestAccountInfo() {
    if (this.testAccount) {
      return {
        user: this.testAccount.user,
        pass: this.testAccount.pass,
        smtp: {
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false
        }
      };
    }
    return null;
  }
}

module.exports = EmailService;
