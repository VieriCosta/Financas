import { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit({ windowMs, max, message = "Muitas tentativas. Tente novamente em instantes." }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.ip}:${req.originalUrl}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message });
    }

    return next();
  };
}
