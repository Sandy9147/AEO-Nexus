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
}
