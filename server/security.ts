import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AuthUser, UserRole } from '../src/types.ts';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sessionId?: string;
}

const SESSION_COOKIE_NAME = 'ahrmp_club_session';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOpaqueToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = (len: number) => {
    const bytes = crypto.randomBytes(len);
    let out = '';
    for (let i = 0; i < len; i++) {
      out += chars[bytes[i] % chars.length];
    }
    return out;
  };
  return `AHRMP-${part(4)}-${part(4)}`;
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      out[key] = decodeURIComponent(val);
    }
  }
  return out;
}

export function getSessionTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    (req.headers.origin?.startsWith('https://') ?? false);
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  if (isHttps) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None; Partitioned`,
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`,
    );
  }
}

export function clearSessionCookie(req: Request, res: Response): void {
  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    (req.headers.origin?.startsWith('https://') ?? false);
  if (isHttps) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`,
    );
  } else {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
    );
  }
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }
  // Allow Bearer token calls or explicit X-Requested-With header or same-origin Origin/Referer
  if (req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    next();
    return;
  }
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        next();
        return;
      }
    } catch {
      res.status(403).json({ error: 'Origem de requisição inválida.' });
      return;
    }
    res.status(403).json({ error: 'Origem não autorizada para esta operação.' });
    return;
  }
  // Non-browser API clients without Origin header (e.g. curl with cookie jar) are permitted only when no cross-site Origin is present
  next();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function sanitizeSafeUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

export function hasAnyRole(user: AuthUser | undefined, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
