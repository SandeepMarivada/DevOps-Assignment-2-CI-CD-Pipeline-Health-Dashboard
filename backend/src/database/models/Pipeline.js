const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Pipeline = sequelize.define('Pipeline', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    branch: {
      type: DataTypes.STRING,
      defaultValue: 'main'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'error'),
      defaultValue: 'active'
    },
    last_build_id: {
      type: DataTypes.UUID,
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
    tableName: 'pipelines',
    timestamps: false,
    underscored: true
  });

  return Pipeline;
};
