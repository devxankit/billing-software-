// Minimal in-memory, per-client rate limiter (single instance).
// Behind a proxy the client IP is the first X-Forwarded-For entry.

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "unknown";
}

/**
 * @param {object} opts
 * @param {number} opts.windowSeconds - length of the counting window
 * @param {number} opts.max - requests allowed per client per window
 * @param {string} opts.message - error shown when the limit is hit
 */
function rateLimit({ windowSeconds, max, message }) {
  const hits = new Map(); // key -> { count, resetAt }

  // Drop finished windows so the map can't grow without bound
  setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of hits) if (now >= rec.resetAt) hits.delete(key);
  }, 60 * 1000).unref();

  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = clientKey(req);
    let rec = hits.get(key);
    if (!rec || now >= rec.resetAt) {
      rec = { count: 0, resetAt: now + windowSeconds * 1000 };
      hits.set(key, rec);
    }
    rec.count += 1;
    if (rec.count > max) {
      const retryAfter = Math.ceil((rec.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ success: false, message, retryAfterSeconds: retryAfter });
    }
    return next();
  };
}

module.exports = { rateLimit };
