const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Build = sequelize.define('Build', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pipeline_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'pipelines',
      key: 'id'
    }
  },
  external_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'External build ID from CI/CD tool'
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'success', 'failed', 'cancelled', 'skipped'),
    allowNull: false,
    defaultValue: 'pending'
  },
  branch: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  commit_hash: {
    type: DataTypes.STRING(40),
    allowNull: true,
    validate: {
      len: [7, 40]
    }
  },
  commit_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  author: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in milliseconds
    allowNull: true,
    validate: {
      min: 0
    }
  },
  logs: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  artifacts: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Build artifacts and metadata'
  },
  environment: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'production'
  },
  trigger_type: {
    type: DataTypes.ENUM('push', 'pull_request', 'manual', 'scheduled', 'webhook'),
    allowNull: true
  },
  failure_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'builds',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['pipeline_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['external_id']
    },
    {
      fields: ['commit_hash']
    },
    {
      fields: ['branch']
    }
  ]
});

// Instance methods
Build.prototype.isRunning = function() {
  return this.status === 'running';
};

Build.prototype.isCompleted = function() {
  return ['success', 'failed', 'cancelled', 'skipped'].includes(this.status);
};

Build.prototype.isSuccessful = function() {
  return this.status === 'success';
};

Build.prototype.isFailed = function() {
  return this.status === 'failed';
};

Build.prototype.calculateDuration = function() {
  if (this.started_at && this.completed_at) {
    this.duration = new Date(this.completed_at) - new Date(this.started_at);
  }
  return this.duration;
};

Build.prototype.markAsStarted = function() {
  this.status = 'running';
  this.started_at = new Date();
  return this.save();
};

Build.prototype.markAsCompleted = function(status, failureReason = null) {
  this.status = status;
  this.completed_at = new Date();
  this.failure_reason = failureReason;
  this.calculateDuration();
  return this.save();
};

// Class methods
Build.findByPipeline = function(pipelineId, options = {}) {
  return this.findAll({
    where: { pipeline_id: pipelineId },
    order: [['created_at', 'DESC']],
    ...options
  });
};

Build.findByStatus = function(status, options = {}) {
  return this.findAll({
    where: { status },
    order: [['created_at', 'DESC']],
    ...options
  });
};

Build.findRecent = function(limit = 50) {
  return this.findAll({
    order: [['created_at', 'DESC']],
    limit
  });
};

Build.findByCommit = function(commitHash) {
  return this.findAll({
    where: { commit_hash: commitHash },
    order: [['created_at', 'DESC']]
  });
};

module.exports = Build;
