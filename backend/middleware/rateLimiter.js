const Redis = require('ioredis');

// Redis client for distributed rate limiting across multiple instances/workers.
// If REDIS_URL is not set or Redis is temporarily down, falls back to in-memory limiter.
let redisClient = null;
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true
    });
    redisClient.connect().catch((err) => {
      console.warn('Redis rate-limiter connection error (falling back to memory):', err.message);
    });
    redisClient.on('error', (err) => {
      // Avoid unhandled errors crashing process if Redis blips
    });
  } catch (err) {
    console.warn('Failed to initialize Redis for rate limiting, using in-memory fallback:', err.message);
    redisClient = null;
  }
}

/**
 * Creates a rate limiter supporting both Redis and in-memory fallback.
 */
const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 15,
  message = 'Too many requests, please try again later.',
  prefix = 'rl',
  keyGenerator = null
}) => {
  const hits = new Map();

  // In-memory periodic cleanup every 5 minutes to prevent memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.resetTime > windowMs) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const memoryCheck = (key) => {
    const now = Date.now();
    const record = hits.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count += 1;
    hits.set(key, record);

    return {
      count: record.count,
      remaining: Math.max(0, max - record.count),
      resetSeconds: Math.ceil((record.resetTime - now) / 1000),
      resetTime: Math.ceil(record.resetTime / 1000)
    };
  };

  return async (req, res, next) => {
    const ip = req.ip || 'unknown';
    const primaryKey = keyGenerator ? keyGenerator(req) : ip;
    const redisKey = `${prefix}:${primaryKey}`;

    let result;

    if (redisClient && redisClient.status === 'ready') {
      try {
        // Finding 4.4 fix: Atomic pipeline for INCR and PTTL; guarantee TTL is set even on edge-case disconnects
        const pipeline = redisClient.pipeline();
        pipeline.incr(redisKey);
        pipeline.pttl(redisKey);
        const [[errIncr, count], [errTtl, ttlMsRaw]] = await pipeline.exec();
        if (errIncr) throw errIncr;

        let ttlMs = ttlMsRaw;
        if (ttlMs < 0) {
          // If key was just created (or lacked expiry), attach TTL immediately
          await redisClient.pexpire(redisKey, windowMs);
          ttlMs = windowMs;
        }

        const resetSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
        result = {
          count,
          remaining: Math.max(0, max - count),
          resetSeconds,
          resetTime: Math.ceil(Date.now() / 1000 + resetSeconds)
        };
      } catch (err) {
        // Fall back to memory on Redis error
        result = memoryCheck(primaryKey);
      }
    } else {
      result = memoryCheck(primaryKey);
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);

    if (result.count > max) {
      return res.status(429).json({
        error: message,
        retryAfterSeconds: result.resetSeconds
      });
    }

    next();
  };
};

// 15 login attempts per 10 minutes per IP
const authLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  prefix: 'rl:auth',
  message: 'Too many login attempts. Please try again after 10 minutes.'
});

// General API limiter: 300 requests per 1 minute per IP
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  prefix: 'rl:api',
  message: 'Request limit exceeded. Please slow down.'
});

// Coupon code validation limiter: 20 attempts per 5 minutes per IP (guards against coupon enumeration)
const couponLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  prefix: 'rl:coupon',
  message: 'Zu viele Versuche zur Gutschein-Validierung. Bitte warten Sie 5 Minuten / Too many coupon validation attempts. Please try again after 5 minutes.'
});

module.exports = { authLimiter, apiLimiter, couponLimiter, createRateLimiter };
