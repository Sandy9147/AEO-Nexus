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
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const ResendVerificationRequestSchema = z.object({
  email: z.string().email(),
});
export type ResendVerificationRequest = z.infer<typeof ResendVerificationRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().optional(),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

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
  emailVerified: boolean;
  createdAt: string;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
  activeWorkspaces: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
}

export interface SessionInfo {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
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
    .regex(/^[a-z0-9-]+$/, 'Slug must be lower-case alphanumeric with dashes'),
});
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceSchema>;

export const InviteWorkspaceMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    'WORKSPACE_OWNER',
    'WORKSPACE_ADMIN',
    'WORKSPACE_MANAGER',
    'EDITOR',
    'VIEWER',
  ]),
});
export type InviteWorkspaceMemberRequest = z.infer<typeof InviteWorkspaceMemberSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
});
export type AcceptInvitationRequest = z.infer<typeof AcceptInvitationSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: z.enum([
    'WORKSPACE_OWNER',
    'WORKSPACE_ADMIN',
    'WORKSPACE_MANAGER',
    'EDITOR',
    'VIEWER',
  ]),
});
export type UpdateMemberRoleRequest = z.infer<typeof UpdateMemberRoleSchema>;

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  createdAt: string;
}

export interface WorkspaceMemberInfo {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface WorkspaceInvitationInfo {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  currentUserRole: string;
  members: WorkspaceMemberInfo[];
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// 5. Business Profile & Context Contracts
// ==============================================================================

export const SaveBusinessProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(120),
  website: z.string().url('Must be a valid URL').or(z.literal('')).optional().nullable(),
  industry: z.string().min(2, 'Industry is required'),
  country: z.string().min(2, 'Country is required'),
  businessSize: z.string().min(1, 'Business size is required'),
  description: z.string().max(1000).optional().nullable(),
});
export type SaveBusinessProfileRequest = z.infer<typeof SaveBusinessProfileSchema>;

export interface BusinessProfileDto {
  id: string;
  workspaceId: string;
  businessName: string;
  website?: string | null;
  industry: string;
  country: string;
  businessSize: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// 6. Brand Profile Contracts
// ==============================================================================

export const SaveBrandProfileSchema = z.object({
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  brandVoice: z.string().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});
export type SaveBrandProfileRequest = z.infer<typeof SaveBrandProfileSchema>;

export interface BrandProfileDto {
  id: string;
  workspaceId: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  brandVoice?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// 7. Onboarding Progress Contracts
// ==============================================================================

export const SaveOnboardingStepSchema = z.object({
  step: z.enum(['business', 'goals', 'brand', 'complete']),
  goals: z.array(z.string()).optional(),
  data: z.record(z.any()).optional(),
});
export type SaveOnboardingStepRequest = z.infer<typeof SaveOnboardingStepSchema>;

export interface OnboardingProgressDto {
  id: string;
  workspaceId: string;
  step: string;
  completed: boolean;
  completedSteps: string[];
  goals: string[];
  data?: Record<string, any> | null;
  updatedAt: string;
}

// ==============================================================================
// 8. Workspace Preferences Contracts
// ==============================================================================

export const UpdateWorkspacePreferenceSchema = z.object({
  timezone: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  emailNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  marketingUpdates: z.boolean().optional(),
});
export type UpdateWorkspacePreferenceRequest = z.infer<typeof UpdateWorkspacePreferenceSchema>;

export interface WorkspacePreferenceDto {
  id: string;
  workspaceId: string;
  timezone: string;
  currency: string;
  emailNotifications: boolean;
  weeklyDigest: boolean;
  marketingUpdates: boolean;
  updatedAt: string;
}

// ==============================================================================
// 9. Dashboard & Application Catalog Contracts
// ==============================================================================

export interface DashboardChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
}

export interface DashboardActivityItem {
  id: string;
  action: string;
  resource: string;
  timestamp: string;
}

export interface DashboardToolItem {
  id: string;
  name: string;
  category: string;
  description: string;
  href: string;
  icon: string;
  status: 'functional' | 'coming-soon';
}

export interface DashboardSummaryDto {
  workspace: {
    id: string;
    name: string;
    slug: string;
    role: string;
  };
  profileCompletion: number;
  businessProfile?: BusinessProfileDto | null;
  brandProfile?: BrandProfileDto | null;
  onboardingCompleted: boolean;
  checklist: DashboardChecklistItem[];
  recentActivity: DashboardActivityItem[];
  recentTools: DashboardToolItem[];
  projectsCount: number;
}

export type AppCategory =
  | 'All'
  | 'Marketing'
  | 'Operations'
  | 'AI & Automation'
  | 'Content'
  | 'Analytics'
  | 'Commerce';

export interface AppCatalogItemDto {
  id: string;
  slug: string;
  name: string;
  category: 'Marketing' | 'Operations' | 'AI & Automation' | 'Content' | 'Analytics' | 'Commerce';
  badge?: string;
  description: string;
  longDescription: string;
  status: 'functional' | 'coming-soon' | 'beta';
  icon: string;
  features: string[];
  launchUrl?: string;
}

