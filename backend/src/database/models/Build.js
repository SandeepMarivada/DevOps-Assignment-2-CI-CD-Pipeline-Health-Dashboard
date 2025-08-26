const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
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
    build_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'success', 'failed', 'cancelled'),
      allowNull: false
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
      type: DataTypes.INTEGER,
      allowNull: true
    },
    commit_hash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: true
    },
    triggered_by: {
      type: DataTypes.STRING,
      allowNull: true
    },
    environment: {
      type: DataTypes.STRING,
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    test_results: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'builds',
    timestamps: false,
    underscored: true
  });

  return Build;
};
