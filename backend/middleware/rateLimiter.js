// In-memory sliding-window rate limiter for brute-force protection
// No external dependencies required

const createRateLimiter = ({ windowMs = 15 * 60 * 1000, max = 15, message = 'Too many requests, please try again later.' }) => {
  const hits = new Map();

  // Periodic cleanup every 5 minutes to prevent memory leak
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

  return (req, res, next) => {
    // req.ip respects Express's `trust proxy` setting, which is configured to trust
    // exactly one hop (nginx). A client can no longer spoof this via X-Forwarded-For.
    const ip = req.ip || 'unknown';
    const now = Date.now();

    const record = hits.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count += 1;
    hits.set(ip, record);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    next();
  };
};

// 10 login attempts per 10 minutes per IP
const authLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: 'Too many login attempts. Please try again after 10 minutes.'
});

// General API limiter: 300 requests per 1 minute
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Request limit exceeded. Please slow down.'
});

module.exports = { authLimiter, apiLimiter };
