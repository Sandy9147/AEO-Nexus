/**
 * AEO Nexus - Permissions and Authorization Model
 *
 * Strict architectural rule:
 * Keep platform administration separate from customer authorization.
 * Never trust a workspace ID supplied by the client without server-side membership verification.
 */

// 1. Platform-level Roles (Administrative Control Plane)
export enum PlatformRole {
  SUPERADMIN = 'SUPERADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  PLATFORM_SUPPORT = 'PLATFORM_SUPPORT',
}

// 2. Workspace-level Roles (Customer Data Plane / Agency Tenancy)
export enum WorkspaceRole {
  WORKSPACE_OWNER = 'WORKSPACE_OWNER',
  WORKSPACE_ADMIN = 'WORKSPACE_ADMIN',
  AGENCY_MANAGER = 'AGENCY_MANAGER',
  WORKSPACE_MEMBER = 'WORKSPACE_MEMBER',
  WORKSPACE_VIEWER = 'WORKSPACE_VIEWER',
}

// 3. Platform Administration Permissions
export enum PlatformPermission {
  TENANT_CREATE = 'platform:tenant:create',
  TENANT_READ = 'platform:tenant:read',
  TENANT_UPDATE = 'platform:tenant:update',
  TENANT_DELETE = 'platform:tenant:delete',
  PLATFORM_SETTINGS_MANAGE = 'platform:settings:manage',
  GLOBAL_AUDIT_LOG_VIEW = 'platform:audit:view',
  SYSTEM_METRICS_VIEW = 'platform:metrics:view',
}

// 4. Workspace Permissions (Isolated per tenant)
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

// Role-to-Permissions Maps
export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  [PlatformRole.SUPERADMIN]: Object.values(PlatformPermission),
  [PlatformRole.PLATFORM_ADMIN]: [
    PlatformPermission.TENANT_CREATE,
    PlatformPermission.TENANT_READ,
    PlatformPermission.TENANT_UPDATE,
    PlatformPermission.GLOBAL_AUDIT_LOG_VIEW,
    PlatformPermission.SYSTEM_METRICS_VIEW,
  ],
  [PlatformRole.PLATFORM_SUPPORT]: [
    PlatformPermission.TENANT_READ,
    PlatformPermission.SYSTEM_METRICS_VIEW,
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
  [WorkspaceRole.AGENCY_MANAGER]: [
    WorkspacePermission.WORKSPACE_MEMBERS_INVITE,
    WorkspacePermission.WORKFLOW_CREATE,
    WorkspacePermission.WORKFLOW_EXECUTE,
    WorkspacePermission.WORKFLOW_READ,
    WorkspacePermission.AI_AGENT_EXECUTE,
    WorkspacePermission.ANALYTICS_VIEW,
  ],
  [WorkspaceRole.WORKSPACE_MEMBER]: [
    WorkspacePermission.WORKFLOW_READ,
    WorkspacePermission.WORKFLOW_EXECUTE,
    WorkspacePermission.AI_AGENT_EXECUTE,
    WorkspacePermission.ANALYTICS_VIEW,
  ],
  [WorkspaceRole.WORKSPACE_VIEWER]: [
    WorkspacePermission.WORKFLOW_READ,
    WorkspacePermission.ANALYTICS_VIEW,
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

/**
 * Membership verification interface
 */
export interface WorkspaceMembershipContext {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  isActive: boolean;
}
