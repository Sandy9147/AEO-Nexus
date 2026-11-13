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
