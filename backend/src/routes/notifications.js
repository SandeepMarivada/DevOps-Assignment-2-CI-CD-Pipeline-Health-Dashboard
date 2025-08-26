const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const SimpleAlertService = require('../services/simpleAlertService');

const alertService = new SimpleAlertService();

// GET /api/notifications - Get all notifications
router.get('/', async (req, res) => {
  try {
    const { limit = 50, type } = req.query;
    
    let notifications;
    if (type) {
      notifications = alertService.getNotificationsByType(type);
    } else {
      notifications = alertService.getNotifications(parseInt(limit));
    }

    res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length
      }
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// POST /api/notifications/test - Test alert
router.post('/test', async (req, res) => {
  try {
    const testBuild = {
      id: 'test-build-1',
      build_number: 999,
      status: 'failed'
    };

    const testPipeline = {
      id: 'test-pipeline-1',
      name: 'Test Pipeline'
    };

    const alert = await alertService.sendBuildAlert(testBuild, testPipeline, 'failed');

    res.json({
      success: true,
      message: 'Test alert sent successfully',
      data: alert
    });
  } catch (error) {
    logger.error('Error sending test alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert'
    });
  }
});

// POST /api/notifications/test-email - Test email functionality
router.post('/test-email', async (req, res) => {
  try {
    const { recipients = [] } = req.body;
    
    const result = await alertService.sendTestEmail(recipients);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          messageId: result.messageId,
          previewURL: result.previewURL,
          recipients: result.recipients
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message || result.error || 'Failed to send test email'
      });
    }
  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email'
    });
  }
});

// GET /api/notifications/email-info - Get email service information
router.get('/email-info', async (req, res) => {
  try {
    const emailInfo = alertService.getEmailServiceInfo();
    
    if (emailInfo) {
      res.json({
        success: true,
        data: emailInfo
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Email service not available'
      });
    }
  } catch (error) {
    logger.error('Error getting email service info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email service info'
    });
  }
});

// DELETE /api/notifications/clear - Clear old notifications
router.delete('/clear', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    alertService.clearOldNotifications(parseInt(hours));

    res.json({
      success: true,
      message: `Cleared notifications older than ${hours} hours`
    });
  } catch (error) {
    logger.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear notifications'
    });
  }
});

// POST /api/notifications/create-from-builds - Create alerts for existing failed builds
router.post('/create-from-builds', async (req, res) => {
  try {
    // Get all builds and pipelines from the database
    const { Build, Pipeline } = require('../database/models');
    
    const builds = await Build.findAll({
      include: [{
        model: Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'status']
      }]
    });
    
    const pipelines = await Pipeline.findAll({
      attributes: ['id', 'name', 'type', 'status']
    });
    
    // Create alerts for failed builds
    const result = await alertService.createAlertsForExistingBuilds(builds, pipelines);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        total_builds: builds.length,
        failed_builds: builds.filter(b => b.status === 'failed').length,
        alerts_created: result.count
      }
    });
  } catch (error) {
    logger.error('Error creating alerts from builds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alerts from builds'
    });
  }
});

module.exports = router;
