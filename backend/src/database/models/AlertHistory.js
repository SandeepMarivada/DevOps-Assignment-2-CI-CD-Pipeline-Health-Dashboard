const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AlertHistory = sequelize.define('AlertHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    alert_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'alerts',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sent_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    recipients: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'alert_history',
    timestamps: false,
    underscored: true
  });

  return AlertHistory;
};
