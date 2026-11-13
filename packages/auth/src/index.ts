import * as crypto from 'crypto';
import { PlatformRole, WorkspaceRole } from '@aeo-nexus/permissions';

export interface JwtTokenPayload {
  sub: string; // userId
  email: string;
  platformRole?: PlatformRole | null;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  platformRole?: PlatformRole | null;
}

export interface AuthenticatedRequestContext {
  user: AuthenticatedUser;
  // Workspace context must be resolved by server middleware after verifying DB membership
  activeWorkspace?: {
    id: string;
    role: WorkspaceRole;
    isOwner: boolean;
  };
}

export interface ITokenService {
  signAccessToken(payload: JwtTokenPayload): Promise<string>;
  verifyAccessToken(token: string): Promise<JwtTokenPayload>;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export const AUTH_HEADER = 'authorization';
export const WORKSPACE_HEADER = 'x-workspace-id';

/**
 * Sign JWT using HMAC-SHA256 with strict minimum 32-character secret material.
 */
export function signJwtHmacSha256(payload: Record<string, unknown>, secret: string): string {
  if (!secret || typeof secret !== 'string' || secret.length < 32) {
    throw new Error(
      'JWT signing error: JWT_SECRET must be provided and contain at least 32 characters of secret material.',
    );
  }

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verify JWT using HMAC-SHA256 with timing-safe comparison and expiration checks.
 */
export function verifyJwtHmacSha256<T = JwtTokenPayload>(token: string, secret: string): T {
  if (!secret || typeof secret !== 'string' || secret.length < 32) {
    throw new Error(
      'JWT verification error: JWT_SECRET must be provided and contain at least 32 characters.',
    );
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: Token must have 3 segments (header.payload.signature).');
  }

  const [header, body, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('JWT verification failed: Invalid cryptographic signature.');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as T;
  const now = Math.floor(Date.now() / 1000);
  const exp = (payload as Record<string, unknown>).exp as number | undefined;

  if (exp !== undefined && now > exp) {
    throw new Error('JWT verification failed: Token has expired.');
  }

  return payload;
}
