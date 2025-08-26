const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AlertHistory = sequelize.define('AlertHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    alert_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'alerts',
        key: 'id'
      }
    },
    triggered_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('triggered', 'acknowledged', 'resolved', 'suppressed'),
      allowNull: false,
      defaultValue: 'triggered'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Alert message content'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional context data about the alert trigger'
    },
    notification_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    notification_channels: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Array of channels where notification was sent'
    },
    notification_error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if notification failed'
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    resolution_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'alert_history',
    timestamps: true,
    indexes: [
      {
        name: 'idx_alert_history_alert',
        fields: ['alert_id']
      },
      {
        name: 'idx_alert_history_triggered',
        fields: ['triggered_at']
      },
      {
        name: 'idx_alert_history_status',
        fields: ['status']
      },
      {
        name: 'idx_alert_history_severity',
        fields: ['severity']
      },
      {
        name: 'idx_alert_history_notification',
        fields: ['notification_sent', 'triggered_at']
      }
    ]
  });

  AlertHistory.associate = (models) => {
    AlertHistory.belongsTo(models.Alert, {
      foreignKey: 'alert_id',
      as: 'alert'
    });
    
    AlertHistory.belongsTo(models.User, {
      foreignKey: 'resolved_by',
      as: 'resolver'
    });
  };

  // Instance methods
  AlertHistory.prototype.isResolved = function() {
    return this.status === 'resolved';
  };

  AlertHistory.prototype.isSuppressed = function() {
    return this.status === 'suppressed';
  };

  AlertHistory.prototype.markResolved = function(userId, notes = '') {
    this.status = 'resolved';
    this.resolved_at = new Date();
    this.resolved_by = userId;
    this.resolution_notes = notes;
    return this.save();
  };

  AlertHistory.prototype.markSuppressed = function(reason = '') {
    this.status = 'suppressed';
    this.metadata = { ...this.metadata, suppression_reason: reason };
    return this.save();
  };

  AlertHistory.prototype.markNotificationSent = function(channels, error = null) {
    this.notification_sent = true;
    this.notification_channels = channels;
    this.notification_error = error;
    return this.save();
  };

  AlertHistory.prototype.getDuration = function() {
    if (!this.triggered_at) return null;
    
    const endTime = this.resolved_at || new Date();
    return Math.floor((endTime - this.triggered_at) / 1000); // Duration in seconds
  };

  AlertHistory.prototype.getFormattedDuration = function() {
    const duration = this.getDuration();
    if (!duration) return 'N/A';
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Class methods
  AlertHistory.findByAlert = function(alertId, limit = 100) {
    return this.findAll({
      where: { alert_id: alertId },
      order: [['triggered_at', 'DESC']],
      limit: limit
    });
  };

  AlertHistory.findByStatus = function(status, limit = 100) {
    return this.findAll({
      where: { status: status },
      include: [{
        model: sequelize.models.Alert,
        as: 'alert',
        attributes: ['id', 'name', 'severity'],
        include: [{
          model: sequelize.models.Pipeline,
          as: 'pipeline',
          attributes: ['id', 'name', 'type', 'team']
        }]
      }],
      order: [['triggered_at', 'DESC']],
      limit: limit
    });
  };

  AlertHistory.findBySeverity = function(severity, limit = 100) {
    return this.findAll({
      where: { severity: severity },
      include: [{
        model: sequelize.models.Alert,
        as: 'alert',
        attributes: ['id', 'name'],
        include: [{
          model: sequelize.models.Pipeline,
          as: 'pipeline',
          attributes: ['id', 'name', 'type', 'team']
        }]
      }],
      order: [['triggered_at', 'DESC']],
      limit: limit
    });
  };

  AlertHistory.findUnresolved = function() {
    return this.findAll({
      where: {
        status: { [sequelize.Op.in]: ['triggered', 'acknowledged'] }
      },
      include: [{
        model: sequelize.models.Alert,
        as: 'alert',
        attributes: ['id', 'name', 'severity'],
        include: [{
          model: sequelize.models.Pipeline,
          as: 'pipeline',
          attributes: ['id', 'name', 'type', 'team']
        }]
      }],
      order: [['severity', 'DESC'], ['triggered_at', 'ASC']]
    });
  };

  AlertHistory.findByDateRange = function(startDate, endDate, limit = 100) {
    return this.findAll({
      where: {
        triggered_at: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      include: [{
        model: sequelize.models.Alert,
        as: 'alert',
        attributes: ['id', 'name', 'severity'],
        include: [{
          model: sequelize.models.Pipeline,
          as: 'pipeline',
          attributes: ['id', 'name', 'type', 'team']
        }]
      }],
      order: [['triggered_at', 'DESC']],
      limit: limit
    });
  };

  AlertHistory.getStatistics = function(startDate, endDate) {
    return this.findAll({
      where: {
        triggered_at: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'status',
        'severity',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.fn('EXTRACT', sequelize.literal('EPOCH FROM (COALESCE(resolved_at, NOW()) - triggered_at)')), 'avg_duration']
      ],
      group: ['status', 'severity'],
      order: [['severity', 'ASC'], ['status', 'ASC']]
    });
  };

  AlertHistory.getTrends = function(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.findAll({
      where: {
        triggered_at: {
          [sequelize.Op.gte]: startDate
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('triggered_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_alerts'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = \'resolved\' THEN 1 END')), 'resolved_alerts'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN severity = \'critical\' THEN 1 END')), 'critical_alerts']
      ],
      group: [sequelize.fn('DATE', sequelize.col('triggered_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('triggered_at')), 'ASC']]
    });
  };

  return AlertHistory;
};
