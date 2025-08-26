const { Sequelize } = require('sequelize');
const { logger } = require('../utils/logger');

let sequelize;

if (process.env.NODE_ENV === 'production') {
  // Production database configuration
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // Disable logging in production
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  // Development database configuration
  sequelize = new Sequelize(
    process.env.DB_NAME || 'cicd_dashboard',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

async function connectDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Sync models with database (in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
}

async function closeDatabase() {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

module.exports = {
  sequelize,
  connectDatabase,
  closeDatabase
};
