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


