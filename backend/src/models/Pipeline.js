const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Pipeline = sequelize.define('Pipeline', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255]
    }
  },
  type: {
    type: DataTypes.ENUM('github-actions', 'jenkins', 'gitlab-ci', 'azure-devops', 'circleci', 'travis-ci'),
    allowNull: false
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      isValidConfig(value) {
        const requiredFields = ['repository', 'branch', 'workflow'];
        const missingFields = requiredFields.filter(field => !value[field]);
        if (missingFields.length > 0) {
          throw new Error(`Missing required config fields: ${missingFields.join(', ')}`);
        }
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'error', 'maintenance'),
    defaultValue: 'inactive',
    allowNull: false
  },
  last_sync: {
    type: DataTypes.DATE
  },
  sync_interval: {
    type: DataTypes.INTEGER, // in minutes
    defaultValue: 5,
    validate: {
      min: 1,
      max: 1440 // max 24 hours
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  team: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
}, {
  tableName: 'pipelines',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['team']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Instance methods
Pipeline.prototype.isActive = function() {
  return this.status === 'active';
};

Pipeline.prototype.getConfigValue = function(key) {
  return this.config[key];
};

Pipeline.prototype.updateLastSync = function() {
  this.last_sync = new Date();
  return this.save();
};

// Class methods
Pipeline.findActive = function() {
  return this.findAll({ where: { status: 'active' } });
};

Pipeline.findByType = function(type) {
  return this.findAll({ where: { type } });
};

Pipeline.findByTeam = function(team) {
  return this.findAll({ where: { team } });
};

Pipeline.findByStatus = function(status) {
  return this.findAll({ where: { status } });
};

module.exports = Pipeline;
