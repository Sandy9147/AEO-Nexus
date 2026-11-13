import { z } from 'zod';

// ==============================================================================
// 1. Standard API Envelope
// ==============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ==============================================================================
// 2. Health & System Status Contracts
// ==============================================================================

export type ServiceStatus = 'up' | 'down' | 'degraded';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  dependencies: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}

// ==============================================================================
// 3. User & Auth Contracts
// ==============================================================================

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  platformRole?: string | null;
  createdAt: string;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
  activeWorkspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

// ==============================================================================
// 4. Workspace & Tenancy Contracts
// ==============================================================================

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceSchema>;

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  createdAt: string;
}
