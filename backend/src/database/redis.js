const redis = require('redis');
const { logger } = require('../utils/logger');

let redisClient;

async function connectRedis() {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Redis max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis Client Connection Ended');
    });

    await redisClient.connect();
    logger.info('Redis connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

async function closeRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
}

// Cache utility functions
async function setCache(key, value, ttl = 3600) {
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Redis set cache error:', error);
    return false;
  }
}

async function getCache(key) {
  try {
    if (redisClient && redisClient.isReady) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    }
    return null;
  } catch (error) {
    logger.error('Redis get cache error:', error);
    return null;
  }
}

async function deleteCache(key) {
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.del(key);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Redis delete cache error:', error);
    return false;
  }
}

async function clearCache() {
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.flushDb();
      logger.info('Redis cache cleared');
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Redis clear cache error:', error);
    return false;
  }
}

module.exports = {
  redisClient,
  connectRedis,
  closeRedis,
  setCache,
  getCache,
  deleteCache,
  clearCache
};
