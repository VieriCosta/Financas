import { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  scope: string;
  key?: (req: Request) => string;
  message?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const maxBuckets = 10_000;

export function rateLimit({ windowMs, max, scope, key, message = "Muitas tentativas. Tente novamente em instantes." }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const bucketKey = `${scope}:${req.ip}:${key?.(req) ?? ""}`;
    const current = buckets.get(bucketKey);

    if (!current || current.resetAt <= now) {
      if (buckets.size >= maxBuckets) {
        for (const [storedKey, bucket] of buckets) {
          if (bucket.resetAt <= now) buckets.delete(storedKey);
        }
      }

      if (buckets.size >= maxBuckets) {
        return res.status(429).json({ message });
      }

      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
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
