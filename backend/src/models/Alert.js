const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Alert = sequelize.define('Alert', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pipeline_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pipelines',
        key: 'id'
      }
    },
    condition_type: {
      type: DataTypes.ENUM('success_rate', 'build_time', 'failure_count', 'consecutive_failures'),
      allowNull: false
    },
    threshold: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    operator: {
      type: DataTypes.ENUM('<', '<=', '>', '>=', '==', '!='),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium'
    },
    channels: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Array of notification channels: ["email", "slack", "webhook"]'
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'triggered', 'acknowledged'),
      allowNull: false,
      defaultValue: 'active'
    },
    cooldown_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Minimum minutes between alert notifications'
    },
    last_triggered: {
      type: DataTypes.DATE,
      allowNull: true
    },
    acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    acknowledged_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional alert configuration data'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'alerts',
    timestamps: true,
    indexes: [
      {
        name: 'idx_alerts_pipeline',
        fields: ['pipeline_id']
      },
      {
        name: 'idx_alerts_status',
        fields: ['status']
      },
      {
        name: 'idx_alerts_severity',
        fields: ['severity']
      },
      {
        name: 'idx_alerts_enabled',
        fields: ['enabled']
      },
      {
        name: 'idx_alerts_condition',
        fields: ['condition_type', 'enabled']
      }
    ]
  });

  Alert.associate = (models) => {
    Alert.belongsTo(models.Pipeline, {
      foreignKey: 'pipeline_id',
      as: 'pipeline'
    });
    
    Alert.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    
    Alert.belongsTo(models.User, {
      foreignKey: 'acknowledged_by',
      as: 'acknowledger'
    });
    
    Alert.hasMany(models.AlertHistory, {
      foreignKey: 'alert_id',
      as: 'history'
    });
  };

  // Instance methods
  Alert.prototype.isTriggered = function() {
    return this.status === 'triggered';
  };

  Alert.prototype.isAcknowledged = function() {
    return this.status === 'acknowledged';
  };

  Alert.prototype.canTrigger = function() {
    if (!this.enabled || this.status === 'acknowledged') {
      return false;
    }
    
    if (this.last_triggered && this.cooldown_minutes > 0) {
      const cooldownEnd = new Date(this.last_triggered.getTime() + (this.cooldown_minutes * 60 * 1000));
      if (new Date() < cooldownEnd) {
        return false;
      }
    }
    
    return true;
  };

  Alert.prototype.trigger = function(metadata = {}) {
    this.status = 'triggered';
    this.last_triggered = new Date();
    this.metadata = { ...this.metadata, ...metadata };
    return this.save();
  };

  Alert.prototype.acknowledge = function(userId, notes = '') {
    this.status = 'acknowledged';
    this.acknowledged_at = new Date();
    this.acknowledged_by = userId;
    this.metadata = { ...this.metadata, acknowledgment_notes: notes };
    return this.save();
  };

  Alert.prototype.reset = function() {
    this.status = 'active';
    this.last_triggered = null;
    this.acknowledged_at = null;
    this.acknowledged_by = null;
    return this.save();
  };

  Alert.prototype.getConditionDescription = function() {
    const conditionMap = {
      'success_rate': 'Success Rate',
      'build_time': 'Build Time',
      'failure_count': 'Failure Count',
      'consecutive_failures': 'Consecutive Failures'
    };
    
    const operatorMap = {
      '<': 'less than',
      '<=': 'less than or equal to',
      '>': 'greater than',
      '>=': 'greater than or equal to',
      '==': 'equal to',
      '!=': 'not equal to'
    };
    
    return `${conditionMap[this.condition_type]} ${operatorMap[this.operator]} ${this.threshold}`;
  };

  // Class methods
  Alert.findActiveByPipeline = function(pipelineId) {
    return this.findAll({
      where: {
        pipeline_id: pipelineId,
        enabled: true,
        status: { [sequelize.Op.in]: ['active', 'triggered'] }
      },
      include: [{
        model: sequelize.models.Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type']
      }]
    });
  };

  Alert.findBySeverity = function(severity) {
    return this.findAll({
      where: {
        severity: severity,
        enabled: true
      },
      include: [{
        model: sequelize.models.Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'team']
      }]
    });
  };

  Alert.findTriggered = function() {
    return this.findAll({
      where: {
        status: 'triggered',
        enabled: true
      },
      include: [{
        model: sequelize.models.Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type', 'team']
      }],
      order: [['severity', 'DESC'], ['last_triggered', 'ASC']]
    });
  };

  Alert.findByConditionType = function(conditionType) {
    return this.findAll({
      where: {
        condition_type: conditionType,
        enabled: true
      },
      include: [{
        model: sequelize.models.Pipeline,
        as: 'pipeline',
        attributes: ['id', 'name', 'type']
      }]
    });
  };

  Alert.getAlertSummary = function() {
    return this.findAll({
      attributes: [
        'severity',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['severity', 'status'],
      order: [['severity', 'ASC'], ['status', 'ASC']]
    });
  };

  return Alert;
};
