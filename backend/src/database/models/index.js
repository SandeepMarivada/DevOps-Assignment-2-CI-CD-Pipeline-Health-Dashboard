const { Sequelize } = require('sequelize');
const { sequelize } = require('../connection');

// Import models
const User = require('./User')(sequelize);
const Pipeline = require('./Pipeline')(sequelize);
const Build = require('./Build')(sequelize);
const Metrics = require('./Metrics')(sequelize);
const Alert = require('./Alert')(sequelize);
const AlertHistory = require('./AlertHistory')(sequelize);

// Define associations
User.hasMany(Pipeline, { foreignKey: 'created_by', as: 'pipelines' });
Pipeline.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Pipeline.hasMany(Build, { foreignKey: 'pipeline_id', as: 'builds' });
Build.belongsTo(Pipeline, { foreignKey: 'pipeline_id', as: 'pipeline' });

Pipeline.hasMany(Metrics, { foreignKey: 'pipeline_id', as: 'metrics' });
Metrics.belongsTo(Pipeline, { foreignKey: 'pipeline_id', as: 'pipeline' });

Pipeline.hasMany(Alert, { foreignKey: 'pipeline_id', as: 'alerts' });
Alert.belongsTo(Pipeline, { foreignKey: 'pipeline_id', as: 'pipeline' });

Alert.hasMany(AlertHistory, { foreignKey: 'alert_id', as: 'history' });
AlertHistory.belongsTo(Alert, { foreignKey: 'alert_id', as: 'alert' });

User.hasMany(Alert, { foreignKey: 'created_by', as: 'created_alerts' });
Alert.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(Alert, { foreignKey: 'acknowledged_by', as: 'acknowledged_alerts' });
Alert.belongsTo(User, { foreignKey: 'acknowledged_by', as: 'acknowledger' });

User.hasMany(AlertHistory, { foreignKey: 'resolved_by', as: 'resolved_alerts' });
AlertHistory.belongsTo(User, { foreignKey: 'resolved_by', as: 'resolver' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User,
  Pipeline,
  Build,
  Metrics,
  Alert,
  AlertHistory
};
