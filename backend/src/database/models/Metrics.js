const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Metrics = sequelize.define('Metrics', {
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
    metric_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'metrics',
    timestamps: false,
    underscored: true
  });

  return Metrics;
};
