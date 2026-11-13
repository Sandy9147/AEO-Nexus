import {
  HealthCheckResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  WorkspaceSummary,
  UserProfile,
  SessionInfo,
  WorkspaceDetail,
  WorkspaceMemberInfo,
  WorkspaceInvitationInfo,
  InviteWorkspaceMemberRequest,
  UpdateMemberRoleRequest,
  UpdateWorkspaceRequest,
  CreateWorkspaceRequest,
  SaveBusinessProfileRequest,
  BusinessProfileDto,
  SaveBrandProfileRequest,
  BrandProfileDto,
  SaveOnboardingStepRequest,
  OnboardingProgressDto,
  UpdateWorkspacePreferenceRequest,
  WorkspacePreferenceDto,
  DashboardSummaryDto,
  AppCatalogItemDto,
  ProjectDto,
  ProjectDetailDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  TaskDto,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskCommentDto,
  CreateTaskCommentRequest,
  ProjectCommentDto,
  CreateProjectCommentRequest,
  AssetFolderDto,
  CreateAssetFolderRequest,
  AssetDto,
  CreateAssetMetadataRequest,
  StorageConfigStatusDto,
  PresignedUploadRequest,
  PresignedUploadResponseDto,
  KnowledgeDocumentDto,
  KnowledgeDocumentDetailDto,
  CreateKnowledgeDocumentRequest,
  UpdateKnowledgeDocumentRequest,
  NotificationDto,
  ActivityEventDto,
} from '@aeo-nexus/contracts';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  getWorkspaceId?: () => string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AeoNexusApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: () => string | null | Promise<string | null>;
  private readonly getWorkspaceId?: () => string | null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAccessToken = options.getAccessToken;
    this.getWorkspaceId = options.getWorkspaceId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (this.getWorkspaceId) {
      const workspaceId = this.getWorkspaceId();
      if (workspaceId && !headers.has('x-workspace-id')) {
        headers.set('x-workspace-id', workspaceId);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const json = await response.json();

    if (!response.ok || json.success === false) {
      throw new ApiError(
        response.status,
        json?.error?.code || 'UNKNOWN_ERROR',
        json?.error?.message || response.statusText,
        json?.error?.details,
      );
    }

    return json.data !== undefined ? (json.data as T) : (json as T);
  }

  // Health
  async getHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health');
  }

  // Auth
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async register(payload: RegisterRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logout(): Promise<{ loggedOut: boolean }> {
    return this.request<{ loggedOut: boolean }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/me');
  }

  async refreshToken(refreshToken?: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async verifyEmail(token: string): Promise<{ verified: boolean; message: string }> {
    return this.request<{ verified: boolean; message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async getSessions(): Promise<SessionInfo[]> {
    return this.request<SessionInfo[]>('/auth/sessions');
  }

  async revokeSession(sessionId: string): Promise<{ revoked: boolean }> {
    return this.request<{ revoked: boolean }>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async revokeAllSessions(): Promise<{ revokedCount: number }> {
    return this.request<{ revokedCount: number }>('/auth/sessions', {
      method: 'DELETE',
    });
  }

  // Workspaces
  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    return this.request<WorkspaceSummary[]>('/workspaces');
  }

  async createWorkspace(payload: CreateWorkspaceRequest): Promise<WorkspaceSummary> {
    return this.request<WorkspaceSummary>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getWorkspace(id: string): Promise<WorkspaceDetail> {
    return this.request<WorkspaceDetail>(`/workspaces/${id}`);
  }

  async updateWorkspace(id: string, payload: UpdateWorkspaceRequest): Promise<WorkspaceDetail> {
    return this.request<WorkspaceDetail>(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async inviteMember(
    workspaceId: string,
    payload: InviteWorkspaceMemberRequest,
  ): Promise<WorkspaceInvitationInfo> {
    return this.request<WorkspaceInvitationInfo>(`/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listInvitations(workspaceId: string): Promise<WorkspaceInvitationInfo[]> {
    return this.request<WorkspaceInvitationInfo[]>(`/workspaces/${workspaceId}/invitations`);
  }

  async cancelInvitation(
    workspaceId: string,
    invitationId: string,
  ): Promise<{ cancelled: boolean }> {
    return this.request<{ cancelled: boolean }>(
      `/workspaces/${workspaceId}/invitations/${invitationId}`,
      {
        method: 'DELETE',
      },
    );
  }

  async acceptInvitation(token: string): Promise<{ accepted: boolean; workspaceId: string }> {
    return this.request<{ accepted: boolean; workspaceId: string }>(
      `/workspaces/invitations/${token}/accept`,
      {
        method: 'POST',
      },
    );
  }

  async declineInvitation(token: string): Promise<{ declined: boolean }> {
    return this.request<{ declined: boolean }>(`/workspaces/invitations/${token}/decline`, {
      method: 'POST',
    });
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMemberInfo[]> {
    return this.request<WorkspaceMemberInfo[]>(`/workspaces/${workspaceId}/members`);
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    payload: UpdateMemberRoleRequest,
  ): Promise<WorkspaceMemberInfo> {
    return this.request<WorkspaceMemberInfo>(
      `/workspaces/${workspaceId}/members/${memberId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  }

  async removeMember(workspaceId: string, memberId: string): Promise<{ removed: boolean }> {
    return this.request<{ removed: boolean }>(
      `/workspaces/${workspaceId}/members/${memberId}`,
      {
        method: 'DELETE',
      },
    );
  }

  // Business Profile
  async getBusinessProfile(workspaceId: string): Promise<BusinessProfileDto | null> {
    return this.request<BusinessProfileDto | null>(`/workspaces/${workspaceId}/business-profile`);
  }

  async saveBusinessProfile(
    workspaceId: string,
    payload: SaveBusinessProfileRequest,
  ): Promise<BusinessProfileDto> {
    return this.request<BusinessProfileDto>(`/workspaces/${workspaceId}/business-profile`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Brand Profile
  async getBrandProfile(workspaceId: string): Promise<BrandProfileDto | null> {
    return this.request<BrandProfileDto | null>(`/workspaces/${workspaceId}/brand-profile`);
  }

  async saveBrandProfile(
    workspaceId: string,
    payload: SaveBrandProfileRequest,
  ): Promise<BrandProfileDto> {
    return this.request<BrandProfileDto>(`/workspaces/${workspaceId}/brand-profile`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Onboarding
  async getOnboardingProgress(workspaceId: string): Promise<OnboardingProgressDto | null> {
    return this.request<OnboardingProgressDto | null>(`/workspaces/${workspaceId}/onboarding`);
  }

  async saveOnboardingStep(
    workspaceId: string,
    payload: SaveOnboardingStepRequest,
  ): Promise<OnboardingProgressDto> {
    return this.request<OnboardingProgressDto>(`/workspaces/${workspaceId}/onboarding/step`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async completeOnboarding(workspaceId: string): Promise<{ completed: boolean }> {
    return this.request<{ completed: boolean }>(`/workspaces/${workspaceId}/onboarding/complete`, {
      method: 'POST',
    });
  }

  // Preferences
  async getWorkspacePreferences(workspaceId: string): Promise<WorkspacePreferenceDto> {
    return this.request<WorkspacePreferenceDto>(`/workspaces/${workspaceId}/preferences`);
  }

  async updateWorkspacePreferences(
    workspaceId: string,
    payload: UpdateWorkspacePreferenceRequest,
  ): Promise<WorkspacePreferenceDto> {
    return this.request<WorkspacePreferenceDto>(`/workspaces/${workspaceId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Dashboard
  async getDashboardSummary(workspaceId: string): Promise<DashboardSummaryDto> {
    return this.request<DashboardSummaryDto>(`/workspaces/${workspaceId}/dashboard-summary`);
  }

  // Application Catalog
  async getAppsCatalog(category?: string, query?: string): Promise<AppCatalogItemDto[]> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.set('category', category);
    if (query) params.set('q', query);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<AppCatalogItemDto[]>(`/apps/catalog${qs}`);
  }

  async getAppBySlug(slug: string): Promise<AppCatalogItemDto> {
    return this.request<AppCatalogItemDto>(`/apps/catalog/${slug}`);
  }

  // ==============================================================================
  // Phase 4: Projects & Tasks
  // ==============================================================================

  async getProjects(
    workspaceId: string,
    params?: { status?: string; search?: string },
  ): Promise<ProjectDto[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    const queryString = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<ProjectDto[]>(`/workspaces/${workspaceId}/projects${queryString}`);
  }

  async getProject(workspaceId: string, projectId: string): Promise<ProjectDetailDto> {
    return this.request<ProjectDetailDto>(`/workspaces/${workspaceId}/projects/${projectId}`);
  }

  async createProject(
    workspaceId: string,
    payload: CreateProjectRequest,
  ): Promise<ProjectDto> {
    return this.request<ProjectDto>(`/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProject(
    workspaceId: string,
    projectId: string,
    payload: UpdateProjectRequest,
  ): Promise<ProjectDto> {
    return this.request<ProjectDto>(`/workspaces/${workspaceId}/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async archiveProject(workspaceId: string, projectId: string): Promise<ProjectDto> {
    return this.request<ProjectDto>(`/workspaces/${workspaceId}/projects/${projectId}/archive`, {
      method: 'POST',
    });
  }

  async deleteProject(workspaceId: string, projectId: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/workspaces/${workspaceId}/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async getProjectTasks(
    workspaceId: string,
    projectId: string,
    params?: { status?: string },
  ): Promise<TaskDto[]> {
    const qs = params?.status ? `?status=${params.status}` : '';
    return this.request<TaskDto[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks${qs}`);
  }

  async createTask(workspaceId: string, payload: CreateTaskRequest): Promise<TaskDto> {
    return this.request<TaskDto>(`/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTask(
    workspaceId: string,
    taskId: string,
    payload: UpdateTaskRequest,
  ): Promise<TaskDto> {
    return this.request<TaskDto>(`/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteTask(workspaceId: string, taskId: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async getTaskComments(workspaceId: string, taskId: string): Promise<TaskCommentDto[]> {
    return this.request<TaskCommentDto[]>(`/workspaces/${workspaceId}/tasks/${taskId}/comments`);
  }

  async createTaskComment(
    workspaceId: string,
    taskId: string,
    payload: CreateTaskCommentRequest,
  ): Promise<TaskCommentDto> {
    return this.request<TaskCommentDto>(`/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getProjectComments(workspaceId: string, projectId: string): Promise<ProjectCommentDto[]> {
    return this.request<ProjectCommentDto[]>(`/workspaces/${workspaceId}/projects/${projectId}/comments`);
  }

  async createProjectComment(
    workspaceId: string,
    projectId: string,
    payload: CreateProjectCommentRequest,
  ): Promise<ProjectCommentDto> {
    return this.request<ProjectCommentDto>(`/workspaces/${workspaceId}/projects/${projectId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==============================================================================
  // Phase 4: Assets & Storage
  // ==============================================================================

  async getStorageStatus(workspaceId: string): Promise<StorageConfigStatusDto> {
    return this.request<StorageConfigStatusDto>(`/workspaces/${workspaceId}/assets/storage-status`);
  }

  async getFolders(workspaceId: string): Promise<AssetFolderDto[]> {
    return this.request<AssetFolderDto[]>(`/workspaces/${workspaceId}/assets/folders`);
  }

  async createFolder(
    workspaceId: string,
    payload: CreateAssetFolderRequest,
  ): Promise<AssetFolderDto> {
    return this.request<AssetFolderDto>(`/workspaces/${workspaceId}/assets/folders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteFolder(workspaceId: string, folderId: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/workspaces/${workspaceId}/assets/folders/${folderId}`, {
      method: 'DELETE',
    });
  }

  async getAssets(
    workspaceId: string,
    params?: { folderId?: string; search?: string },
  ): Promise<AssetDto[]> {
    const qs = new URLSearchParams();
    if (params?.folderId) qs.set('folderId', params.folderId);
    if (params?.search) qs.set('search', params.search);
    const queryString = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<AssetDto[]>(`/workspaces/${workspaceId}/assets${queryString}`);
  }

  async getAsset(workspaceId: string, assetId: string): Promise<AssetDto> {
    return this.request<AssetDto>(`/workspaces/${workspaceId}/assets/${assetId}`);
  }

  async requestPresignedUpload(
    workspaceId: string,
    payload: PresignedUploadRequest,
  ): Promise<PresignedUploadResponseDto> {
    return this.request<PresignedUploadResponseDto>(`/workspaces/${workspaceId}/assets/upload-url`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createAssetMetadata(
    workspaceId: string,
    payload: CreateAssetMetadataRequest,
  ): Promise<AssetDto> {
    return this.request<AssetDto>(`/workspaces/${workspaceId}/assets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteAsset(workspaceId: string, assetId: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/workspaces/${workspaceId}/assets/${assetId}`, {
      method: 'DELETE',
    });
  }

  // ==============================================================================
  // Phase 4: Knowledge Base
  // ==============================================================================

  async getKnowledgeDocuments(
    workspaceId: string,
    params?: { category?: string; status?: string; search?: string },
  ): Promise<KnowledgeDocumentDto[]> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    const queryString = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<KnowledgeDocumentDto[]>(`/workspaces/${workspaceId}/knowledge${queryString}`);
  }

  async getKnowledgeDocument(
    workspaceId: string,
    documentId: string,
  ): Promise<KnowledgeDocumentDetailDto> {
    return this.request<KnowledgeDocumentDetailDto>(`/workspaces/${workspaceId}/knowledge/${documentId}`);
  }

  async createKnowledgeDocument(
    workspaceId: string,
    payload: CreateKnowledgeDocumentRequest,
  ): Promise<KnowledgeDocumentDto> {
    return this.request<KnowledgeDocumentDto>(`/workspaces/${workspaceId}/knowledge`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateKnowledgeDocument(
    workspaceId: string,
    documentId: string,
    payload: UpdateKnowledgeDocumentRequest,
  ): Promise<KnowledgeDocumentDto> {
    return this.request<KnowledgeDocumentDto>(`/workspaces/${workspaceId}/knowledge/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteKnowledgeDocument(
    workspaceId: string,
    documentId: string,
  ): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/workspaces/${workspaceId}/knowledge/${documentId}`, {
      method: 'DELETE',
    });
  }

  // ==============================================================================
  // Phase 4: Notifications & Activity
  // ==============================================================================

  async getNotifications(
    workspaceId: string,
    unreadOnly = false,
  ): Promise<NotificationDto[]> {
    const qs = unreadOnly ? '?unread=true' : '';
    return this.request<NotificationDto[]>(`/workspaces/${workspaceId}/notifications${qs}`);
  }

  async markNotificationRead(
    workspaceId: string,
    notificationId: string,
  ): Promise<NotificationDto> {
    return this.request<NotificationDto>(`/workspaces/${workspaceId}/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead(workspaceId: string): Promise<{ updatedCount: number }> {
    return this.request<{ updatedCount: number }>(`/workspaces/${workspaceId}/notifications/read-all`, {
      method: 'POST',
    });
  }

  async getActivityFeed(
    workspaceId: string,
    limit = 20,
  ): Promise<ActivityEventDto[]> {
    return this.request<ActivityEventDto[]>(`/workspaces/${workspaceId}/activity?limit=${limit}`);
  }
}
