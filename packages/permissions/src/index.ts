/**
 * AEO Nexus - Permissions and Authorization Model
 *
 * Strict architectural rule:
 * Keep platform administration separate from customer authorization.
 * Never trust a workspace ID supplied by the client without server-side membership verification.
 */

// 1. Platform-level Roles (Administrative Control Plane)
export enum PlatformRole {
  PLATFORM_SUPER_ADMIN = 'PLATFORM_SUPER_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  BILLING_OPERATOR = 'BILLING_OPERATOR',
}

// 2. Workspace-level Roles (Customer Data Plane / Tenancy)
export enum WorkspaceRole {
  WORKSPACE_OWNER = 'WORKSPACE_OWNER',
  WORKSPACE_ADMIN = 'WORKSPACE_ADMIN',
  WORKSPACE_MANAGER = 'WORKSPACE_MANAGER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// 3. Agency-level Roles (Separately Scoped Partner Tenancy)
export enum AgencyRole {
  AGENCY_OWNER = 'AGENCY_OWNER',
  AGENCY_ADMIN = 'AGENCY_ADMIN',
  AGENCY_MANAGER = 'AGENCY_MANAGER',
  AGENCY_EDITOR = 'AGENCY_EDITOR',
  AGENCY_CLIENT = 'AGENCY_CLIENT',
}

// 4. Platform Administration Permissions
export enum PlatformPermission {
  TENANT_CREATE = 'platform:tenant:create',
  TENANT_READ = 'platform:tenant:read',
  TENANT_UPDATE = 'platform:tenant:update',
  TENANT_DELETE = 'platform:tenant:delete',
  PLATFORM_SETTINGS_MANAGE = 'platform:settings:manage',
  GLOBAL_AUDIT_LOG_VIEW = 'platform:audit:view',
  SYSTEM_METRICS_VIEW = 'platform:metrics:view',
  BILLING_MANAGE = 'platform:billing:manage',
}

// 5. Workspace Permissions (Isolated per tenant)
export enum WorkspacePermission {
  WORKSPACE_SETTINGS_MANAGE = 'workspace:settings:manage',
  WORKSPACE_MEMBERS_MANAGE = 'workspace:members:manage',
  WORKSPACE_MEMBERS_INVITE = 'workspace:members:invite',
  WORKSPACE_BILLING_MANAGE = 'workspace:billing:manage',
  WORKFLOW_CREATE = 'workspace:workflow:create',
  WORKFLOW_EXECUTE = 'workspace:workflow:execute',
  WORKFLOW_READ = 'workspace:workflow:read',
  WORKFLOW_DELETE = 'workspace:workflow:delete',
  AI_AGENT_CONFIG = 'workspace:ai:config',
  AI_AGENT_EXECUTE = 'workspace:ai:execute',
  ANALYTICS_VIEW = 'workspace:analytics:view',
}

// 6. Agency Permissions (Partner multi-tenant management)
export enum AgencyPermission {
  AGENCY_SETTINGS_MANAGE = 'agency:settings:manage',
  AGENCY_CLIENTS_MANAGE = 'agency:clients:manage',
  AGENCY_CLIENTS_VIEW = 'agency:clients:view',
  AGENCY_MEMBERS_MANAGE = 'agency:members:manage',
  AGENCY_BILLING_MANAGE = 'agency:billing:manage',
}

// Role-to-Permissions Maps
export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  [PlatformRole.PLATFORM_SUPER_ADMIN]: Object.values(PlatformPermission),
  [PlatformRole.PLATFORM_ADMIN]: [
    PlatformPermission.TENANT_CREATE,
    PlatformPermission.TENANT_READ,
    PlatformPermission.TENANT_UPDATE,
    PlatformPermission.GLOBAL_AUDIT_LOG_VIEW,
    PlatformPermission.SYSTEM_METRICS_VIEW,
  ],
  [PlatformRole.SUPPORT_AGENT]: [
    PlatformPermission.TENANT_READ,
    PlatformPermission.SYSTEM_METRICS_VIEW,
  ],
  [PlatformRole.BILLING_OPERATOR]: [
    PlatformPermission.TENANT_READ,
    PlatformPermission.BILLING_MANAGE,
  ],
};

export const WORKSPACE_ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspacePermission[]> = {
  [WorkspaceRole.WORKSPACE_OWNER]: Object.values(WorkspacePermission),
  [WorkspaceRole.WORKSPACE_ADMIN]: [
    WorkspacePermission.WORKSPACE_SETTINGS_MANAGE,
    WorkspacePermission.WORKSPACE_MEMBERS_MANAGE,
    WorkspacePermission.WORKSPACE_MEMBERS_INVITE,
    WorkspacePermission.WORKFLOW_CREATE,
    WorkspacePermission.WORKFLOW_EXECUTE,
    WorkspacePermission.WORKFLOW_READ,
    WorkspacePermission.AI_AGENT_CONFIG,
    WorkspacePermission.AI_AGENT_EXECUTE,
    WorkspacePermission.ANALYTICS_VIEW,
  ],
  [WorkspaceRole.WORKSPACE_MANAGER]: [
    WorkspacePermission.WORKSPACE_MEMBERS_INVITE,
    WorkspacePermission.WORKFLOW_CREATE,
    WorkspacePermission.WORKFLOW_EXECUTE,
    WorkspacePermission.WORKFLOW_READ,
    WorkspacePermission.AI_AGENT_EXECUTE,
    WorkspacePermission.ANALYTICS_VIEW,
  ],
  [WorkspaceRole.EDITOR]: [
    WorkspacePermission.WORKFLOW_READ,
    WorkspacePermission.WORKFLOW_EXECUTE,
    WorkspacePermission.AI_AGENT_EXECUTE,
    WorkspacePermission.ANALYTICS_VIEW,
  ],
  [WorkspaceRole.VIEWER]: [
    WorkspacePermission.WORKFLOW_READ,
    WorkspacePermission.ANALYTICS_VIEW,
  ],
};

export const AGENCY_ROLE_PERMISSIONS: Record<AgencyRole, AgencyPermission[]> = {
  [AgencyRole.AGENCY_OWNER]: Object.values(AgencyPermission),
  [AgencyRole.AGENCY_ADMIN]: [
    AgencyPermission.AGENCY_SETTINGS_MANAGE,
    AgencyPermission.AGENCY_CLIENTS_MANAGE,
    AgencyPermission.AGENCY_CLIENTS_VIEW,
    AgencyPermission.AGENCY_MEMBERS_MANAGE,
  ],
  [AgencyRole.AGENCY_MANAGER]: [
    AgencyPermission.AGENCY_CLIENTS_MANAGE,
    AgencyPermission.AGENCY_CLIENTS_VIEW,
  ],
  [AgencyRole.AGENCY_EDITOR]: [
    AgencyPermission.AGENCY_CLIENTS_VIEW,
  ],
  [AgencyRole.AGENCY_CLIENT]: [
    AgencyPermission.AGENCY_CLIENTS_VIEW,
  ],
};

export function hasPlatformPermission(
  role: PlatformRole | null | undefined,
  permission: PlatformPermission,
): boolean {
  if (!role) return false;
  const permissions = PLATFORM_ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasWorkspacePermission(
  role: WorkspaceRole | null | undefined,
  permission: WorkspacePermission,
): boolean {
  if (!role) return false;
  const permissions = WORKSPACE_ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

export function hasAgencyPermission(
  role: AgencyRole | null | undefined,
  permission: AgencyPermission,
): boolean {
  if (!role) return false;
  const permissions = AGENCY_ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Membership verification interface
 */
export interface WorkspaceMembershipContext {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  isActive: boolean;
}
