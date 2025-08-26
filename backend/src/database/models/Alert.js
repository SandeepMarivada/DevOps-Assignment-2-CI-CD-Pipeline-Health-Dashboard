const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Alert = sequelize.define('Alert', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    conditions: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    notifications: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    channels: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'alerts',
    timestamps: false,
    underscored: true
  });

  return Alert;
};
