import rateLimit from 'express-rate-limit';
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 min
  max: 20,                            // 20 attempts / window / IP
  standardHeaders: true, legacyHeaders: false,
});