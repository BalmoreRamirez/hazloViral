import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

type Policy = { limit: number; windowMs: number };
type Bucket = { count: number; resetAt: number };

const POLICIES: Record<string, Policy> = {
  'POST /api/auth/login': { limit: 10, windowMs: 15 * 60_000 },
  'POST /api/auth/forgot-password': { limit: 5, windowMs: 60 * 60_000 },
  'POST /api/auth/reset-password': { limit: 10, windowMs: 15 * 60_000 },
  'POST /api/auth/register/empresa': { limit: 5, windowMs: 60 * 60_000 },
  'POST /api/auth/register/influencer': { limit: 5, windowMs: 60 * 60_000 },
};

/** Per-process safety net; deployments should also rate-limit these paths at the edge. */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method: string;
      baseUrl?: string;
      route?: { path?: string };
      originalUrl?: string;
      ip?: string;
      body?: { email?: string };
    }>();
    const route = `${request.method} ${(request.originalUrl ?? `/api${request.baseUrl ?? ''}${request.route?.path ?? ''}`).split('?')[0]}`;
    const policy = POLICIES[route];
    if (!policy) return true;

    const now = Date.now();
    if (this.buckets.size >= 20_000) {
      for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
      if (this.buckets.size >= 20_000) this.buckets.delete(this.buckets.keys().next().value as string);
    }
    const ip = request.ip || 'unknown';
    const email = request.body?.email?.trim().toLowerCase();
    const keys = [`${route}:ip:${ip}`];
    if (email && (route.includes('/login') || route.includes('/forgot-password'))) {
      const emailKey = createHash('sha256').update(email).digest('hex');
      keys.push(`${route}:email:${emailKey}`);
    }

    for (const key of keys) {
      const bucket = this.buckets.get(key);
      if (bucket?.resetAt && bucket.resetAt <= now) this.buckets.delete(key);
      const current = this.buckets.get(key);
      if (current && current.count >= policy.limit) {
        throw new HttpException('Demasiadas solicitudes. Inténtalo más tarde.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
    for (const key of keys) {
      const current = this.buckets.get(key);
      if (current) current.count += 1;
      else this.buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
    }
    return true;
  }
}
