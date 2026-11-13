import {
  HealthCheckResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  WorkspaceSummary,
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

  // Workspaces
  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    return this.request<WorkspaceSummary[]>('/workspaces');
  }
}
