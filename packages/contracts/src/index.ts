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
  mfaCode: z.string().optional(),
  recoveryCode: z.string().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const MfaLoginRequestSchema = z.object({
  mfaTicket: z.string().min(1, 'MFA ticket is required'),
  code: z.string().optional(),
  recoveryCode: z.string().optional(),
});
export type MfaLoginRequest = z.infer<typeof MfaLoginRequestSchema>;

export const MfaVerifyRequestSchema = z.object({
  code: z.string().min(6, 'Verification code is required'),
});
export type MfaVerifyRequest = z.infer<typeof MfaVerifyRequestSchema>;

export const MfaDisableRequestSchema = z.object({
  password: z.string().min(8, 'Password is required to disable MFA'),
  code: z.string().min(6, 'MFA code is required to disable MFA'),
});
export type MfaDisableRequest = z.infer<typeof MfaDisableRequestSchema>;

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

export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaTicket: string;
  user: UserProfile;
}

export type LoginResult = LoginResponse | MfaChallengeResponse;

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

// ==============================================================================
// 10. Phase 4: Project & Task Management Contracts
// ==============================================================================

export const ProjectStatusEnum = z.enum([
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
]);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

export const TaskStatusEnum = z.enum([
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'COMPLETED',
  'BLOCKED',
]);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const TaskPriorityEnum = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(2000).optional(),
  status: ProjectStatusEnum.default('PLANNING').optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  memberIds: z.array(z.string().uuid()).optional(),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: ProjectStatusEnum.optional(),
  progress: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  memberIds: z.array(z.string().uuid()).optional(),
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>;

export interface ProjectMemberDto {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
}

export interface ProjectDto {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  progress: number;
  startDate?: string | null;
  dueDate?: string | null;
  ownerId: string;
  owner: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  membersCount: number;
  tasksCount: number;
  completedTasksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailDto extends ProjectDto {
  members: ProjectMemberDto[];
  tasks: TaskDto[];
  commentsCount: number;
}

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid('Project ID must be a valid UUID'),
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(5000).optional(),
  status: TaskStatusEnum.default('TODO').optional(),
  priority: TaskPriorityEnum.default('MEDIUM').optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});
export type CreateTaskRequest = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  assignedToId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});
export type UpdateTaskRequest = z.infer<typeof UpdateTaskSchema>;

export interface TaskDto {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  } | null;
  createdById: string;
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  dueDate?: string | null;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const CreateTaskCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(3000),
});
export type CreateTaskCommentRequest = z.infer<typeof CreateTaskCommentSchema>;

export interface TaskCommentDto {
  id: string;
  taskId: string;
  authorId: string;
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const CreateProjectCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(3000),
});
export type CreateProjectCommentRequest = z.infer<typeof CreateProjectCommentSchema>;

export interface ProjectCommentDto {
  id: string;
  projectId: string;
  authorId: string;
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// 11. Phase 4: Asset & Storage Contracts
// ==============================================================================

export const CreateAssetFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100),
  parentId: z.string().uuid().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});
export type CreateAssetFolderRequest = z.infer<typeof CreateAssetFolderSchema>;

export interface AssetFolderDto {
  id: string;
  workspaceId: string;
  name: string;
  parentId?: string | null;
  color?: string | null;
  subfoldersCount: number;
  assetsCount: number;
  createdAt: string;
  updatedAt: string;
}

export const PresignedUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().max(100 * 1024 * 1024, 'Max file size is 100MB'),
  folderId: z.string().uuid().optional().nullable(),
});
export type PresignedUploadRequest = z.infer<typeof PresignedUploadRequestSchema>;

export interface PresignedUploadResponseDto {
  uploadUrl: string;
  downloadUrl: string;
  key: string;
  expiresInSeconds: number;
  method: 'PUT' | 'POST';
}

export const CreateAssetMetadataSchema = z.object({
  name: z.string().min(1).max(255),
  storageKey: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  folderId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateAssetMetadataRequest = z.infer<typeof CreateAssetMetadataSchema>;

export interface AssetDto {
  id: string;
  workspaceId: string;
  folderId?: string | null;
  folder?: {
    id: string;
    name: string;
  } | null;
  name: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorageConfigStatusDto {
  isConfigured: boolean;
  provider: 's3' | 'r2' | 'unconfigured';
  bucket?: string;
  region?: string;
  warning?: string;
}

// ==============================================================================
// 12. Phase 4: Business Knowledge Base Contracts
// ==============================================================================

export const KnowledgeCategoryEnum = z.enum([
  'COMPANY',
  'PRODUCTS',
  'SERVICES',
  'FAQS',
  'POLICIES',
  'BRAND',
  'MARKETING',
  'OPERATIONS',
  'OTHER',
]);
export type KnowledgeCategory = z.infer<typeof KnowledgeCategoryEnum>;

export const KnowledgeStatusEnum = z.enum([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);
export type KnowledgeStatus = z.infer<typeof KnowledgeStatusEnum>;

export const CreateKnowledgeDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required').max(200),
  category: KnowledgeCategoryEnum.default('COMPANY'),
  content: z.string().min(1, 'Document content is required'),
  status: KnowledgeStatusEnum.default('PUBLISHED').optional(),
  tags: z.array(z.string()).default([]),
  sourceUrl: z.string().url().optional().nullable().or(z.literal('')),
});
export type CreateKnowledgeDocumentRequest = z.infer<typeof CreateKnowledgeDocumentSchema>;

export const UpdateKnowledgeDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: KnowledgeCategoryEnum.optional(),
  content: z.string().min(1).optional(),
  status: KnowledgeStatusEnum.optional(),
  tags: z.array(z.string()).optional(),
  sourceUrl: z.string().url().optional().nullable().or(z.literal('')),
  changeNote: z.string().max(500).optional(),
});
export type UpdateKnowledgeDocumentRequest = z.infer<typeof UpdateKnowledgeDocumentSchema>;

export interface KnowledgeDocumentVersionDto {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  changeNote?: string | null;
  createdById: string;
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface KnowledgeDocumentDto {
  id: string;
  workspaceId: string;
  title: string;
  category: KnowledgeCategory;
  contentSnippet: string;
  status: KnowledgeStatus;
  tags: string[];
  sourceUrl?: string | null;
  authorId: string;
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocumentDetailDto extends KnowledgeDocumentDto {
  content: string;
  versions: KnowledgeDocumentVersionDto[];
}

// ==============================================================================
// 13. Phase 4: Collaboration, Notifications & Activity Contracts
// ==============================================================================

export const NotificationTypeEnum = z.enum([
  'PROJECT_INVITE',
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'COMMENT_ADDED',
  'ASSET_UPLOADED',
  'DOCUMENT_PUBLISHED',
  'SYSTEM_ALERT',
]);
export type NotificationType = z.infer<typeof NotificationTypeEnum>;

export interface NotificationDto {
  id: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  resourceId?: string | null;
  resourceType?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityEventDto {
  id: string;
  workspaceId: string;
  actorId: string;
  actor: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ==============================================================================
// 14. Phase 5: AI Foundation & AI Business Agent Contracts
// ==============================================================================

export const AiRunStatusEnum = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'REQUIRES_APPROVAL',
  'CANCELLED',
]);
export type AiRunStatus = z.infer<typeof AiRunStatusEnum>;

export const AiApprovalStatusEnum = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
]);
export type AiApprovalStatus = z.infer<typeof AiApprovalStatusEnum>;

export const AiActionTypeEnum = z.enum([
  'PUBLISH_CONTENT',
  'SEND_EXTERNAL_MESSAGE',
  'DELETE_DATA',
  'MODIFY_SETTINGS',
  'SPEND_MONEY',
  'EXTERNAL_INTEGRATION',
]);
export type AiActionType = z.infer<typeof AiActionTypeEnum>;

export interface AiCitationDto {
  documentId: string;
  title: string;
  snippet?: string;
  url?: string;
}

export interface AiToolExecutionDto {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status?: 'SUCCESS' | 'FAILED' | 'REQUIRES_APPROVAL';
  error?: string;
}

export interface AiMessageDto {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  citations?: AiCitationDto[] | null;
  toolCalls?: AiToolExecutionDto[] | null;
  tokensUsed?: number | null;
  createdAt: string;
}

export interface AiConversationDto {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  model: string;
  provider: string;
  systemPrompt?: string | null;
  isArchived: boolean;
  messagesCount: number;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationDetailDto extends AiConversationDto {
  messages: AiMessageDto[];
}

export const CreateAiConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).max(50).optional(),
  systemPrompt: z.string().max(4000).optional(),
  initialMessage: z.string().min(1).max(20000).optional(),
});
export type CreateAiConversationRequest = z.infer<typeof CreateAiConversationSchema>;

export const UpdateAiConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().min(1).max(100).optional(),
  provider: z.string().min(1).max(50).optional(),
  systemPrompt: z.string().max(4000).optional().nullable(),
  isArchived: z.boolean().optional(),
});
export type UpdateAiConversationRequest = z.infer<typeof UpdateAiConversationSchema>;

export const SendAiMessageSchema = z.object({
  content: z.string().min(1).max(20000),
  model: z.string().optional(),
  stream: z.boolean().optional(),
});
export type SendAiMessageRequest = z.infer<typeof SendAiMessageSchema>;

export interface AiRunDto {
  id: string;
  workspaceId: string;
  conversationId?: string | null;
  userId: string;
  prompt: string;
  status: AiRunStatus;
  provider: string;
  model: string;
  stepCount: number;
  error?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiRunDetailDto extends AiRunDto {
  steps?: Array<{
    stepNumber: number;
    type: string;
    description: string;
    input?: unknown;
    output?: unknown;
    status: string;
    timestamp: string;
  }> | null;
  approvals: AiApprovalDto[];
}

export interface AiApprovalDto {
  id: string;
  workspaceId: string;
  runId?: string | null;
  conversationId?: string | null;
  actionType: AiActionType;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: AiApprovalStatus;
  requestedById: string;
  requestedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  reviewedById?: string | null;
  reviewedBy?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
}

export const ReviewAiApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().max(1000).optional(),
});
export type ReviewAiApprovalRequest = z.infer<typeof ReviewAiApprovalSchema>;

export interface AiWorkspaceConfigDto {
  id: string;
  workspaceId: string;
  defaultProvider: string;
  defaultModel: string;
  monthlyTokenBudget: number;
  monthlyCostBudget: number;
  requireApprovalForSensitive: boolean;
  customSystemInstructions?: string | null;
  tokensUsedThisMonth: number;
  costUsedThisMonth: number;
  createdAt: string;
  updatedAt: string;
}

export const UpdateAiWorkspaceConfigSchema = z.object({
  defaultProvider: z.string().min(1).max(50).optional(),
  defaultModel: z.string().min(1).max(100).optional(),
  monthlyTokenBudget: z.number().int().min(1000).max(100000000).optional(),
  monthlyCostBudget: z.number().min(1).max(10000).optional(),
  requireApprovalForSensitive: z.boolean().optional(),
  customSystemInstructions: z.string().max(5000).optional().nullable(),
});
export type UpdateAiWorkspaceConfigRequest = z.infer<typeof UpdateAiWorkspaceConfigSchema>;

export interface AiPromptTemplateDto {
  id: string;
  workspaceId?: string | null;
  name: string;
  slug: string;
  category: string;
  description: string;
  templateText: string;
  variables: string[];
  createdAt: string;
}

export interface AiUsageSummaryDto {
  workspaceId: string;
  totalTokens: number;
  totalCostUsd: number;
  recordsCount: number;
  monthlyTokenBudget: number;
  monthlyCostBudget: number;
  tokenBudgetRemaining: number;
  costBudgetRemaining: number;
  byModel: Array<{
    model: string;
    provider: string;
    tokens: number;
    costUsd: number;
    requestCount: number;
  }>;
}

export interface AiToolDto {
  id: string;
  name: string;
  description: string;
  requiresApproval: boolean;
  parameters: Record<string, unknown>;
}

export interface AiProviderStatusDto {
  id: string;
  name: string;
  isConfigured: boolean;
  availableModels: Array<{
    id: string;
    name: string;
    description: string;
    contextWindow: number;
    inputCostPer1M: number;
    outputCostPer1M: number;
  }>;
}

// ==============================================================================
// 14. Phase 6A: Discover — AI Business Research & Opportunity Intelligence
// ==============================================================================

export type ResearchStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type EvidenceType = 'VERIFIED_SOURCE' | 'AI_ANALYSIS' | 'USER_INPUT' | 'UNVERIFIED_ASSUMPTION';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'SPECULATIVE';
export type SourceType = 'WEB_SEARCH' | 'KNOWLEDGE_VAULT' | 'INDUSTRY_REPORT' | 'USER_DOCUMENT' | 'OFFLINE_KNOWLEDGE';

export interface ResearchProjectDto {
  id: string;
  workspaceId: string;
  createdById: string;
  title: string;
  topic: string;
  industry?: string | null;
  targetCountry?: string | null;
  targetAudience?: string | null;
  businessDescription?: string | null;
  objective: string;
  status: ResearchStatus;
  executiveSummary?: string | null;
  methodology?: string | null;
  confidenceScore: number;
  tokensUsed: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  findingsCount?: number;
  sourcesCount?: number;
  opportunitiesCount?: number;
  competitorsCount?: number;
}

export interface ResearchRunDto {
  id: string;
  researchId: string;
  status: ResearchStatus;
  provider: string;
  model: string;
  prompt?: string | null;
  rawResponse?: string | null;
  error?: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchFindingDto {
  id: string;
  researchId: string;
  category: string;
  title: string;
  description: string;
  evidenceType: EvidenceType;
  confidenceLevel: ConfidenceLevel;
  evidenceDetails?: string | null;
  risks?: string | null;
  recommendations?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchSourceDto {
  id: string;
  researchId: string;
  title: string;
  url?: string | null;
  sourceType: SourceType;
  publicationDate?: string | null;
  accessTimestamp: string;
  snippet?: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface CompetitorDto {
  id: string;
  workspaceId: string;
  researchId?: string | null;
  name: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  productsServices?: string | null;
  positioning?: string | null;
  pricingObservations?: string | null;
  contentObservations?: string | null;
  strengths: string[];
  weaknesses: string[];
  differentiationOpportunities?: string | null;
  evidenceType: EvidenceType;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceProfileDto {
  id: string;
  workspaceId: string;
  researchId?: string | null;
  segmentName: string;
  isAiGenerated: boolean;
  idealCustomerProfile?: string | null;
  demographics?: string | null;
  painPoints: string[];
  needs: string[];
  buyingMotivations: string[];
  objections: string[];
  customerJourney?: {
    awareness?: string[];
    consideration?: string[];
    decision?: string[];
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketOpportunityDto {
  id: string;
  workspaceId: string;
  researchId?: string | null;
  title: string;
  description: string;
  customerProblem: string;
  marketDemandEvidence: string;
  competitionAnalysis?: string | null;
  differentiation: string;
  businessFeasibility?: string | null;
  potentialBusinessModel?: string | null;
  assumptions: string[];
  risks: string[];
  confidenceLevel: ConfidenceLevel;
  suggestedExperiment: string;
  evidenceType: EvidenceType;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AEOResearchQuestionDto {
  id: string;
  workspaceId: string;
  researchId?: string | null;
  topic: string;
  queryQuestion: string;
  targetIndustry?: string | null;
  expectedPersona?: string | null;
  results?: AEOResearchResultDto[];
  createdAt: string;
  updatedAt: string;
}

export interface AEOResearchResultDto {
  id: string;
  questionId: string;
  provider: string;
  model: string;
  brandMentioned: boolean;
  brandRank?: number | null;
  brandSentiment?: string | null;
  competitorsMentioned: string[];
  citations?: Array<{ title: string; url?: string; snippet?: string }> | null;
  rawAnswerExcerpt?: string | null;
  isActualMeasurement: boolean;
  researchTimestamp: string;
  createdAt: string;
}

export interface ResearchDetailDto extends ResearchProjectDto {
  findings: ResearchFindingDto[];
  sources: ResearchSourceDto[];
  opportunities: MarketOpportunityDto[];
  competitors: CompetitorDto[];
  audienceProfiles: AudienceProfileDto[];
  aeoQuestions: AEOResearchQuestionDto[];
  runs: ResearchRunDto[];
}

export interface DiscoverOverviewDto {
  totalResearch: number;
  completedResearch: number;
  totalOpportunities: number;
  totalCompetitors: number;
  totalAudienceProfiles: number;
  totalAeoQuestions: number;
  recentResearch: ResearchProjectDto[];
  recentOpportunities: MarketOpportunityDto[];
  recentCompetitors: CompetitorDto[];
  recentAudience: AudienceProfileDto[];
}

// Validation Schemas
export const CreateResearchProjectSchema = z.object({
  title: z.string().min(2).max(200),
  topic: z.string().min(2).max(300),
  industry: z.string().max(100).optional(),
  targetCountry: z.string().max(100).optional(),
  targetAudience: z.string().max(200).optional(),
  businessDescription: z.string().max(2000).optional(),
  objective: z.string().max(100).default('COMPREHENSIVE'),
  additionalInstructions: z.string().max(2000).optional(),
});
export type CreateResearchProjectRequest = z.infer<typeof CreateResearchProjectSchema>;

export const UpdateResearchProjectSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  objective: z.string().max(100).optional(),
  executiveSummary: z.string().optional(),
});
export type UpdateResearchProjectRequest = z.infer<typeof UpdateResearchProjectSchema>;

export const CreateCompetitorSchema = z.object({
  name: z.string().min(2).max(100),
  website: z.string().url().or(z.literal('')).optional(),
  industry: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  productsServices: z.string().max(2000).optional(),
  positioning: z.string().max(1000).optional(),
  pricingObservations: z.string().max(1000).optional(),
  contentObservations: z.string().max(1000).optional(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  differentiationOpportunities: z.string().max(1000).optional(),
  evidenceType: z.enum(['VERIFIED_SOURCE', 'AI_ANALYSIS', 'USER_INPUT', 'UNVERIFIED_ASSUMPTION']).default('USER_INPUT'),
  isVerified: z.boolean().default(false),
  researchId: z.string().uuid().optional(),
});
export type CreateCompetitorRequest = z.infer<typeof CreateCompetitorSchema>;

export const UpdateCompetitorSchema = CreateCompetitorSchema.partial();
export type UpdateCompetitorRequest = z.infer<typeof UpdateCompetitorSchema>;

export const CreateAudienceProfileSchema = z.object({
  segmentName: z.string().min(2).max(100),
  isAiGenerated: z.boolean().default(false),
  idealCustomerProfile: z.string().max(2000).optional(),
  demographics: z.string().max(1000).optional(),
  painPoints: z.array(z.string()).default([]),
  needs: z.array(z.string()).default([]),
  buyingMotivations: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  customerJourney: z.object({
    awareness: z.array(z.string()).optional(),
    consideration: z.array(z.string()).optional(),
    decision: z.array(z.string()).optional(),
  }).optional(),
  researchId: z.string().uuid().optional(),
});
export type CreateAudienceProfileRequest = z.infer<typeof CreateAudienceProfileSchema>;

export const UpdateAudienceProfileSchema = CreateAudienceProfileSchema.partial();
export type UpdateAudienceProfileRequest = z.infer<typeof UpdateAudienceProfileSchema>;

export const CreateMarketOpportunitySchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(5).max(3000),
  customerProblem: z.string().min(5).max(2000),
  marketDemandEvidence: z.string().min(5).max(2000),
  competitionAnalysis: z.string().max(2000).optional(),
  differentiation: z.string().min(5).max(2000),
  businessFeasibility: z.string().max(2000).optional(),
  potentialBusinessModel: z.string().max(1000).optional(),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  confidenceLevel: z.enum(['HIGH', 'MEDIUM', 'LOW', 'SPECULATIVE']).default('MEDIUM'),
  suggestedExperiment: z.string().min(5).max(2000),
  evidenceType: z.enum(['VERIFIED_SOURCE', 'AI_ANALYSIS', 'USER_INPUT', 'UNVERIFIED_ASSUMPTION']).default('AI_ANALYSIS'),
  status: z.string().default('DISCOVERED'),
  researchId: z.string().uuid().optional(),
});
export type CreateMarketOpportunityRequest = z.infer<typeof CreateMarketOpportunitySchema>;

export const UpdateMarketOpportunitySchema = CreateMarketOpportunitySchema.partial();
export type UpdateMarketOpportunityRequest = z.infer<typeof UpdateMarketOpportunitySchema>;

export const CreateAEOResearchQuestionSchema = z.object({
  topic: z.string().min(2).max(200),
  queryQuestion: z.string().min(5).max(500),
  targetIndustry: z.string().max(100).optional(),
  expectedPersona: z.string().max(200).optional(),
  researchId: z.string().uuid().optional(),
});
export type CreateAEOResearchQuestionRequest = z.infer<typeof CreateAEOResearchQuestionSchema>;

// ============================================================================
// Phase 6B: Plan — AI Business Planning & Strategic Roadmap Contracts
// ============================================================================

export type PlanStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ARCHIVED';

export type GoalCategory =
  | 'REVENUE'
  | 'CUSTOMER_ACQUISITION'
  | 'CUSTOMER_RETENTION'
  | 'WEBSITE_TRAFFIC'
  | 'BRAND_AWARENESS'
  | 'AEO_VISIBILITY'
  | 'PRODUCT_LAUNCH'
  | 'OPERATIONAL_EFFICIENCY';

export type GoalStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'BEHIND'
  | 'ACHIEVED'
  | 'CANCELLED';

export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InitiativePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InitiativeStatus =
  | 'PROPOSED'
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type ReviewPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
export type ReviewStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

// ---------------------------------------------------------------------------
// Strategic Plan Schemas & DTOs
// ---------------------------------------------------------------------------

export const CreateStrategicPlanSchema = z.object({
  title: z.string().min(2).max(200),
  planType: z.string().default('BUSINESS_LAUNCH'),
  businessStage: z.string().optional(),
  targetMarket: z.string().optional(),
  targetAudience: z.string().optional(),
  horizonMonths: z.number().int().min(1).max(60).default(12),
  budgetRange: z.string().optional(),
  teamSize: z.string().optional(),
  researchId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  executiveSummary: z.string().optional(),
  currentSituation: z.string().optional(),
  marketPositioning: z.string().optional(),
  strategicObjectives: z.array(z.string()).default([]),
  requiredResources: z.array(z.string()).default([]),
  budgetAssumptions: z.array(z.string()).default([]),
  risksAndMitigations: z.any().optional(),
  dependencies: z.array(z.string()).default([]),
  timelineAssumptions: z.array(z.string()).default([]),
  successMetrics: z.array(z.string()).default([]),
  validationRequirements: z.array(z.string()).default([]),
  nextRecommendedActions: z.array(z.string()).default([]),
  confidenceScore: z.number().min(0).max(1).default(0.85).optional(),
});
export type CreateStrategicPlanRequest = z.infer<typeof CreateStrategicPlanSchema>;

export const GenerateStrategicPlanSchema = z.object({
  title: z.string().min(2).max(200),
  planType: z.string().default('BUSINESS_LAUNCH'),
  businessStage: z.string().optional(),
  targetMarket: z.string().optional(),
  targetCountry: z.string().optional(),
  targetAudience: z.string().optional(),
  desiredOutcomes: z.string().optional(),
  budgetRange: z.string().optional(),
  timeline: z.string().optional(),
  teamSize: z.string().optional(),
  researchId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  additionalInstructions: z.string().max(2000).optional(),
});
export type GenerateStrategicPlanRequest = z.infer<typeof GenerateStrategicPlanSchema>;

export const UpdateStrategicPlanSchema = CreateStrategicPlanSchema.partial().extend({
  status: z.enum([
    'DRAFT',
    'GENERATING',
    'READY_FOR_REVIEW',
    'APPROVED',
    'ACTIVE',
    'COMPLETED',
    'ARCHIVED',
  ]).optional(),
});
export type UpdateStrategicPlanRequest = z.infer<typeof UpdateStrategicPlanSchema>;

export interface StrategicPlanDto {
  id: string;
  workspaceId: string;
  createdById: string;
  title: string;
  planType: string;
  businessStage: string | null;
  targetMarket: string | null;
  targetAudience: string | null;
  horizonMonths: number;
  budgetRange: string | null;
  teamSize: string | null;
  status: PlanStatus;
  executiveSummary: string | null;
  currentSituation: string | null;
  marketPositioning: string | null;
  strategicObjectives: string[];
  requiredResources: string[];
  budgetAssumptions: string[];
  risksAndMitigations: any | null;
  dependencies: string[];
  timelineAssumptions: string[];
  successMetrics: string[];
  validationRequirements: string[];
  nextRecommendedActions: string[];
  confidenceScore: number;
  researchId: string | null;
  opportunityId: string | null;
  currentVersionNumber: number;
  goalsCount?: number;
  initiativesCount?: number;
  roadmapsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicPlanVersionDto {
  id: string;
  planId: string;
  versionNumber: number;
  title: string;
  content: any;
  changeSummary: string | null;
  createdById: string;
  createdAt: string;
}

export interface StrategicPlanDetailDto extends StrategicPlanDto {
  versions: StrategicPlanVersionDto[];
  goals: BusinessGoalDto[];
  initiatives: StrategicInitiativeDto[];
  roadmaps: StrategicRoadmapDto[];
  reviews: StrategyReviewDto[];
  recommendations: PlanningRecommendationDto[];
}

// ---------------------------------------------------------------------------
// Business Goal Schemas & DTOs
// ---------------------------------------------------------------------------

export const CreateBusinessGoalSchema = z.object({
  planId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum([
    'REVENUE',
    'CUSTOMER_ACQUISITION',
    'CUSTOMER_RETENTION',
    'WEBSITE_TRAFFIC',
    'BRAND_AWARENESS',
    'AEO_VISIBILITY',
    'PRODUCT_LAUNCH',
    'OPERATIONAL_EFFICIENCY',
  ]).default('REVENUE'),
  targetValue: z.number(),
  currentValue: z.number().default(0),
  unit: z.string().default('USD'),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  status: z.enum([
    'NOT_STARTED',
    'IN_PROGRESS',
    'ON_TRACK',
    'AT_RISK',
    'BEHIND',
    'ACHIEVED',
    'CANCELLED',
  ]).default('NOT_STARTED'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  measurementFrequency: z.string().default('MONTHLY'),
  isQualitative: z.boolean().default(false),
  assignedOwnerId: z.string().uuid().optional(),
});
export type CreateBusinessGoalRequest = z.infer<typeof CreateBusinessGoalSchema>;

export const UpdateBusinessGoalSchema = CreateBusinessGoalSchema.partial();
export type UpdateBusinessGoalRequest = z.infer<typeof UpdateBusinessGoalSchema>;

export const RecordGoalProgressSchema = z.object({
  newValue: z.number(),
  note: z.string().max(1000).optional(),
  isExternalMeasurement: z.boolean().default(false),
});
export type RecordGoalProgressRequest = z.infer<typeof RecordGoalProgressSchema>;

export interface GoalProgressRecordDto {
  id: string;
  goalId: string;
  recordedById: string;
  previousValue: number;
  newValue: number;
  note: string | null;
  isExternalMeasurement: boolean;
  recordedAt: string;
}

export interface BusinessGoalDto {
  id: string;
  workspaceId: string;
  planId: string | null;
  title: string;
  description: string | null;
  category: GoalCategory;
  targetValue: number;
  currentValue: number;
  unit: string;
  progressPercent: number;
  startDate: string | null;
  targetDate: string | null;
  status: GoalStatus;
  priority: GoalPriority;
  measurementFrequency: string;
  isQualitative: boolean;
  assignedOwnerId: string | null;
  progressRecords?: GoalProgressRecordDto[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Strategic Initiative Schemas & DTOs
// ---------------------------------------------------------------------------

export const CreateStrategicInitiativeSchema = z.object({
  planId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  roadmapPhaseId: z.string().uuid().optional(),
  name: z.string().min(2).max(200),
  description: z.string().max(3000).optional(),
  strategicRationale: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  status: z.enum([
    'PROPOSED',
    'PLANNED',
    'IN_PROGRESS',
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED',
  ]).default('PLANNED'),
  expectedImpact: z.string().default('HIGH'),
  estimatedEffort: z.string().default('MEDIUM'),
  estimatedCost: z.string().optional(),
  risks: z.array(z.string()).default([]),
  recommendedActions: z.array(z.string()).default([]),
  evidenceReferences: z.any().optional(),
  evidenceType: z.enum([
    'VERIFIED_SOURCE',
    'AI_ANALYSIS',
    'USER_INPUT',
    'UNVERIFIED_ASSUMPTION',
  ]).default('AI_ANALYSIS'),
  ownerId: z.string().uuid().optional(),
});
export type CreateStrategicInitiativeRequest = z.infer<typeof CreateStrategicInitiativeSchema>;

export const UpdateStrategicInitiativeSchema = CreateStrategicInitiativeSchema.partial();
export type UpdateStrategicInitiativeRequest = z.infer<typeof UpdateStrategicInitiativeSchema>;

export const ConvertInitiativeToProjectSchema = z.object({
  projectName: z.string().min(2).max(200).optional(),
  projectDescription: z.string().max(2000).optional(),
  createInitialTasks: z.boolean().default(true),
});
export type ConvertInitiativeToProjectRequest = z.infer<typeof ConvertInitiativeToProjectSchema>;

export interface StrategicInitiativeDto {
  id: string;
  workspaceId: string;
  planId: string | null;
  goalId: string | null;
  opportunityId: string | null;
  roadmapPhaseId: string | null;
  name: string;
  description: string | null;
  strategicRationale: string | null;
  priority: InitiativePriority;
  status: InitiativeStatus;
  expectedImpact: string;
  estimatedEffort: string;
  estimatedCost: string | null;
  risks: string[];
  recommendedActions: string[];
  evidenceReferences: any | null;
  evidenceType: EvidenceType;
  ownerId: string | null;
  projectId: string | null;
  convertedAt: string | null;
  dependencies?: InitiativeDependencyDto[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Initiative Dependencies
// ---------------------------------------------------------------------------

export const CreateInitiativeDependencySchema = z.object({
  dependsOnId: z.string().uuid(),
  dependencyType: z.string().default('BLOCKS'),
});
export type CreateInitiativeDependencyRequest = z.infer<typeof CreateInitiativeDependencySchema>;

export interface InitiativeDependencyDto {
  id: string;
  initiativeId: string;
  dependsOnId: string;
  dependencyType: string;
  dependsOnInitiative?: {
    id: string;
    name: string;
    status: string;
    priority: string;
  };
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Strategic Roadmap, Phases & Milestones
// ---------------------------------------------------------------------------

export const CreateStrategicRoadmapSchema = z.object({
  planId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type CreateStrategicRoadmapRequest = z.infer<typeof CreateStrategicRoadmapSchema>;

export const UpdateStrategicRoadmapSchema = CreateStrategicRoadmapSchema.partial();
export type UpdateStrategicRoadmapRequest = z.infer<typeof UpdateStrategicRoadmapSchema>;

export const CreateRoadmapPhaseSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  phaseOrder: z.number().int().min(1).default(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().default('NOT_STARTED'),
});
export type CreateRoadmapPhaseRequest = z.infer<typeof CreateRoadmapPhaseSchema>;

export interface RoadmapPhaseDto {
  id: string;
  roadmapId: string;
  name: string;
  description: string | null;
  phaseOrder: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  initiatives?: StrategicInitiativeDto[];
  milestones?: RoadmapMilestoneDto[];
  createdAt: string;
  updatedAt: string;
}

export const CreateRoadmapMilestoneSchema = z.object({
  roadmapId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  targetDate: z.string(),
  status: z.string().default('PENDING'),
  successCriteria: z.string().max(2000).optional(),
});
export type CreateRoadmapMilestoneRequest = z.infer<typeof CreateRoadmapMilestoneSchema>;

export const UpdateRoadmapMilestoneSchema = CreateRoadmapMilestoneSchema.partial();
export type UpdateRoadmapMilestoneRequest = z.infer<typeof UpdateRoadmapMilestoneSchema>;

export interface RoadmapMilestoneDto {
  id: string;
  workspaceId: string;
  roadmapId: string;
  phaseId: string | null;
  title: string;
  description: string | null;
  targetDate: string;
  status: string;
  successCriteria: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicRoadmapDto {
  id: string;
  workspaceId: string;
  planId: string | null;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  phases: RoadmapPhaseDto[];
  milestones: RoadmapMilestoneDto[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Strategy Reviews
// ---------------------------------------------------------------------------

export const CreateStrategyReviewSchema = z.object({
  planId: z.string().uuid(),
  period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']).default('MONTHLY'),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED']).default('COMPLETED'),
  summary: z.string().min(5).max(4000),
  goalsReviewed: z.any().optional(),
  initiativesReviewed: z.any().optional(),
  blockersIdentified: z.array(z.string()).default([]),
  changedAssumptions: z.array(z.string()).default([]),
  aiRecommendations: z.array(z.string()).default([]),
  strategicAdjustments: z.array(z.string()).default([]),
  reviewDate: z.string().optional(),
});
export type CreateStrategyReviewRequest = z.infer<typeof CreateStrategyReviewSchema>;

export interface StrategyReviewDto {
  id: string;
  workspaceId: string;
  planId: string;
  conductedById: string;
  period: ReviewPeriod;
  status: ReviewStatus;
  summary: string;
  goalsReviewed: any | null;
  initiativesReviewed: any | null;
  blockersIdentified: string[];
  changedAssumptions: string[];
  aiRecommendations: string[];
  strategicAdjustments: string[];
  reviewDate: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Planning Recommendations & Dashboard Overview
// ---------------------------------------------------------------------------

export interface PlanningRecommendationDto {
  id: string;
  workspaceId: string;
  planId: string | null;
  title: string;
  recommendation: string;
  category: string;
  impact: string;
  urgency: string;
  evidenceType: EvidenceType;
  isActioned: boolean;
  actionedAt: string | null;
  createdAt: string;
}

export interface PlanningOverviewDto {
  totalPlans: number;
  activePlans: number;
  totalGoals: number;
  achievedGoals: number;
  totalInitiatives: number;
  highPriorityInitiatives: number;
  upcomingMilestonesCount: number;
  overdueMilestonesCount: number;
  activePlansList: StrategicPlanDto[];
  goals: BusinessGoalDto[];
  initiatives: StrategicInitiativeDto[];
  upcomingMilestones: RoadmapMilestoneDto[];
  overdueMilestones: RoadmapMilestoneDto[];
  recommendations: PlanningRecommendationDto[];
  recentReviews: StrategyReviewDto[];
}



// ==============================================================================
// 12. Phase 6C: Build — AI Website & Landing Page Builder Contracts
// ==============================================================================

export const WebsiteStatusEnum = z.enum([
  'DRAFT',
  'GENERATING',
  'READY',
  'PUBLISHED',
  'ARCHIVED',
]);
export type WebsiteStatus = z.infer<typeof WebsiteStatusEnum>;

export const SectionTypeEnum = z.enum([
  'HERO',
  'ANNOUNCEMENT_BAR',
  'NAVIGATION',
  'LOGO_STRIP',
  'FEATURES',
  'SERVICES',
  'ABOUT',
  'IMAGE_TEXT',
  'GALLERY',
  'PROCESS_STEPS',
  'PRICING',
  'FAQ',
  'TESTIMONIALS',
  'CONTACT',
  'CTA',
  'FOOTER',
]);
export type SectionType = z.infer<typeof SectionTypeEnum>;

export const RESERVED_SUBDOMAINS = [
  'api',
  'admin',
  'www',
  'app',
  'login',
  'mail',
  'auth',
  'public',
  'sites',
  'dashboard',
  'support',
  'status',
  'billing',
  'root',
  'staging',
  'test',
];

export const SubdomainSchema = z
  .string()
  .min(3, 'Subdomain must be at least 3 characters')
  .max(63, 'Subdomain cannot exceed 63 characters')
  .regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/, 'Subdomain must contain only lowercase alphanumeric characters and hyphens, and cannot start or end with a hyphen')
  .refine((val) => !RESERVED_SUBDOMAINS.includes(val.toLowerCase()), {
    message: 'This subdomain is reserved by the platform',
  });

export const CreateWebsiteProjectSchema = z.object({
  name: z.string().min(2, 'Website name must be at least 2 characters').max(100),
  websiteType: z.string().default('BUSINESS_WEBSITE'),
  description: z.string().max(2000).optional(),
  targetAudience: z.string().max(500).optional(),
  targetMarket: z.string().max(500).optional(),
  planId: z.string().uuid().optional(),
  initiativeId: z.string().uuid().optional(),
});
export type CreateWebsiteProjectRequest = z.infer<typeof CreateWebsiteProjectSchema>;

export const GenerateWebsiteSchema = z.object({
  name: z.string().min(2).max(100),
  websiteType: z.string().default('BUSINESS_WEBSITE'),
  businessDescription: z.string().max(3000).optional(),
  targetAudience: z.string().max(500).optional(),
  targetMarket: z.string().max(500).optional(),
  websitePurpose: z.string().max(500).optional(),
  requiredPages: z.array(z.string()).default(['/', '/about', '/services', '/contact']),
  brandColors: z
    .object({
      primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
    .optional(),
  planId: z.string().uuid().optional(),
  initiativeId: z.string().uuid().optional(),
  additionalInstructions: z.string().max(2000).optional(),
});
export type GenerateWebsiteRequest = z.infer<typeof GenerateWebsiteSchema>;

export const UpdateWebsiteProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  websiteType: z.string().optional(),
  description: z.string().max(2000).optional().nullable(),
  targetAudience: z.string().max(500).optional().nullable(),
  targetMarket: z.string().max(500).optional().nullable(),
  status: WebsiteStatusEnum.optional(),
});
export type UpdateWebsiteProjectRequest = z.infer<typeof UpdateWebsiteProjectSchema>;

export const UpdateWebsiteThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  surfaceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color').optional(),
  headingFont: z.string().max(50).optional(),
  bodyFont: z.string().max(50).optional(),
  buttonStyle: z.enum(['ROUNDED', 'PILL', 'SQUARE']).optional(),
  borderRadius: z.string().max(20).optional(),
  sectionSpacing: z.enum(['COMPACT', 'MEDIUM', 'RELAXED']).optional(),
});
export type UpdateWebsiteThemeRequest = z.infer<typeof UpdateWebsiteThemeSchema>;

export const CreateWebsitePageSchema = z.object({
  title: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^\/?[a-z0-9\-_/]*$/, 'Invalid page slug format'),
  pageOrder: z.number().int().default(0),
  isHome: z.boolean().default(false),
  seoTitle: z.string().max(150).optional(),
  seoDescription: z.string().max(300).optional(),
  sections: z.array(z.any()).default([]),
});
export type CreateWebsitePageRequest = z.infer<typeof CreateWebsitePageSchema>;

export const UpdateWebsitePageSchema = CreateWebsitePageSchema.partial();
export type UpdateWebsitePageRequest = z.infer<typeof UpdateWebsitePageSchema>;

export const SavePageSectionsSchema = z.object({
  sections: z.array(z.any()),
});
export type SavePageSectionsRequest = z.infer<typeof SavePageSectionsSchema>;

export const RegenerateSectionSchema = z.object({
  sectionType: SectionTypeEnum,
  prompt: z.string().max(1000).optional(),
});
export type RegenerateSectionRequest = z.infer<typeof RegenerateSectionSchema>;

export const PublishWebsiteSchema = z.object({
  subdomain: SubdomainSchema,
});
export type PublishWebsiteRequest = z.infer<typeof PublishWebsiteSchema>;

// DTO Interfaces
export interface WebsiteThemeDto {
  id: string;
  websiteId: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  buttonStyle: string;
  borderRadius: string;
  sectionSpacing: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsitePageDto {
  id: string;
  websiteId: string;
  title: string;
  slug: string;
  pageOrder: number;
  isHome: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: any[];
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteVersionDto {
  id: string;
  websiteId: string;
  versionNumber: number;
  title: string;
  snapshot: any;
  changeSummary: string | null;
  createdById: string;
  createdAt: string;
}

export interface WebsitePublicationDto {
  id: string;
  websiteId: string;
  versionId: string;
  subdomain: string;
  publishedUrl: string;
  publishedById: string;
  status: string;
  publishedAt: string;
  unpublishedAt: string | null;
}

export interface WebsiteProjectDto {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  slug: string;
  websiteType: string;
  status: WebsiteStatus;
  description: string | null;
  targetAudience: string | null;
  targetMarket: string | null;
  planId: string | null;
  initiativeId: string | null;
  currentVersionNumber: number;
  publishedSubdomain: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  pagesCount?: number;
  theme?: WebsiteThemeDto;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteDetailDto extends WebsiteProjectDto {
  theme: WebsiteThemeDto;
  pages: WebsitePageDto[];
  versions: WebsiteVersionDto[];
  publications: WebsitePublicationDto[];
}

export interface BuildOverviewDto {
  totalWebsites: number;
  publishedWebsites: number;
  draftWebsites: number;
  websites: WebsiteProjectDto[];
  recentPublications: WebsitePublicationDto[];
}

export interface PublicWebsiteDto {
  name: string;
  slug: string;
  subdomain: string;
  publishedUrl: string;
  publishedAt: string;
  theme: WebsiteThemeDto;
  pages: Array<{
    title: string;
    slug: string;
    isHome: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
    sections: any[];
  }>;
}
