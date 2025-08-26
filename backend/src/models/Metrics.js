const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Metrics = sequelize.define('Metrics', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pipeline_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pipelines',
        key: 'id'
      }
    },
    metric_type: {
      type: DataTypes.ENUM('success_rate', 'build_time', 'failure_count', 'deployment_frequency', 'lead_time'),
      allowNull: false
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    period: {
      type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly'),
      allowNull: false,
      defaultValue: 'daily'
    },
    period_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    period_end: {
      type: DataTypes.DATE,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metric-specific data'
    },
    calculated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'metrics',
    timestamps: true,
    indexes: [
      {
        name: 'idx_metrics_pipeline_period',
        fields: ['pipeline_id', 'period', 'period_start']
      },
      {
        name: 'idx_metrics_type_period',
        fields: ['metric_type', 'period', 'period_start']
      },
      {
        name: 'idx_metrics_calculated_at',
        fields: ['calculated_at']
      }
    ]
  });

  Metrics.associate = (models) => {
    Metrics.belongsTo(models.Pipeline, {
      foreignKey: 'pipeline_id',
      as: 'pipeline'
    });
  };

  // Instance methods
  Metrics.prototype.getFormattedValue = function() {
    if (this.metric_type === 'success_rate') {
      return `${this.value.toFixed(2)}%`;
    } else if (this.metric_type === 'build_time') {
      return `${this.value.toFixed(2)}s`;
    } else if (this.metric_type === 'deployment_frequency') {
      return `${this.value.toFixed(2)}/day`;
    } else {
      return this.value.toString();
    }
  };

  // Class methods
  Metrics.findByPipelineAndPeriod = function(pipelineId, metricType, period, startDate, endDate) {
    return this.findAll({
      where: {
        pipeline_id: pipelineId,
        metric_type: metricType,
        period: period,
        period_start: { [sequelize.Op.gte]: startDate },
        period_end: { [sequelize.Op.lte]: endDate }
      },
      order: [['period_start', 'ASC']]
    });
  };

  Metrics.getLatestMetric = function(pipelineId, metricType) {
    return this.findOne({
      where: {
        pipeline_id: pipelineId,
        metric_type: metricType
      },
      order: [['period_start', 'DESC']]
    });
  };

  Metrics.getAggregatedMetrics = function(pipelineIds, metricType, period, startDate, endDate) {
    return this.findAll({
      where: {
        pipeline_id: { [sequelize.Op.in]: pipelineIds },
        metric_type: metricType,
        period: period,
        period_start: { [sequelize.Op.gte]: startDate },
        period_end: { [sequelize.Op.lte]: endDate }
      },
      attributes: [
        'pipeline_id',
        [sequelize.fn('AVG', sequelize.col('value')), 'average_value'],
        [sequelize.fn('MIN', sequelize.col('value')), 'min_value'],
        [sequelize.fn('MAX', sequelize.col('value')), 'max_value'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'data_points']
      ],
      group: ['pipeline_id'],
      order: [['pipeline_id', 'ASC']]
    });
  };

  return Metrics;
};
