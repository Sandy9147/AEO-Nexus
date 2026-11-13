/**
 * AEO Nexus — Security & Multi-Tenant Isolation Automated Audit Suite
 *
 * Verifies:
 * 1. No authentication (HTTP 401)
 * 2. Invalid or expired authentication (HTTP 401)
 * 3. Valid authentication (JWT verified)
 * 4. Workspace A accessing its own resource (Allowed)
 * 5. Workspace A user attempting to access Workspace B's resource (HTTP 403 - Tenant Isolation)
 * 6. Viewer attempting a restricted operation (HTTP 403 - RBAC)
 * 7. Workspace Admin attempting an unauthorized platform operation (HTTP 403 - Separation of Planes)
 */

import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RequestWithUser } from '../src/auth/guards/jwt-auth.guard';
import { WorkspaceMembershipGuard, RequestWithWorkspace } from '../src/auth/guards/workspace.guard';
import { PlatformRoleGuard, REQUIRED_PLATFORM_ROLES_KEY } from '../src/auth/guards/platform-role.guard';
import { WorkspaceRoleGuard, REQUIRED_WORKSPACE_ROLES_KEY } from '../src/auth/guards/workspace-role.guard';
import { signJwtHmacSha256 } from '@aeo-nexus/auth';
import { PlatformRole, WorkspaceRole } from '@aeo-nexus/permissions';

const TEST_SECRET = 'c7a4b8f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9';
process.env.JWT_SECRET = TEST_SECRET;

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failCount++;
  }
}

function createMockContext(req: Record<string, unknown>, handlerMeta: Record<string, unknown> = {}): {
  context: ExecutionContext;
  reflector: Reflector;
} {
  const reflector = new Reflector();
  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => handlerMeta.handler || (() => {}),
    getClass: () => handlerMeta.class || class {},
  } as unknown as ExecutionContext;

  return { context, reflector };
}

async function runSecurityAudit() {
  console.log('================================================================');
  console.log('       AEO Nexus — Security & Tenant Isolation Audit Suite');
  console.log('================================================================\n');

  const jwtGuard = new JwtAuthGuard();

  // --------------------------------------------------------------------------
  // Check 1: No Authentication (Missing Header)
  // --------------------------------------------------------------------------
  console.log('Test 1: Unauthenticated request rejection');
  try {
    const req = { headers: {} };
    const { context } = createMockContext(req);
    jwtGuard.canActivate(context);
    assert(false, 'Unauthenticated request must be rejected');
  } catch (err: any) {
    assert(
      err instanceof UnauthorizedException,
      'Unauthenticated request rejected with UnauthorizedException (401)',
    );
  }

  // --------------------------------------------------------------------------
  // Check 2: Invalid & Expired Authentication
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Invalid, Tampered & Expired JWT rejection');
  try {
    const req = { headers: { authorization: 'Bearer invalid.garbage.token' } };
    const { context } = createMockContext(req);
    jwtGuard.canActivate(context);
    assert(false, 'Malformed token must be rejected');
  } catch (err: any) {
    assert(
      err instanceof UnauthorizedException,
      'Malformed token rejected with UnauthorizedException (401)',
    );
  }

  try {
    // Expired token
    const expiredToken = signJwtHmacSha256(
      { sub: 'usr_test_1', exp: Math.floor(Date.now() / 1000) - 60 },
      TEST_SECRET,
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const { context } = createMockContext(req);
    jwtGuard.canActivate(context);
    assert(false, 'Expired token must be rejected');
  } catch (err: any) {
    assert(
      err instanceof UnauthorizedException &&
        (err.message.includes('expired') || err.message.includes('Invalid')),
      'Expired token rejected with UnauthorizedException (401)',
    );
  }

  // --------------------------------------------------------------------------
  // Check 3: Valid Authentication
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Valid Authentication Acceptance');
  try {
    const validToken = signJwtHmacSha256(
      { sub: 'usr_sarah_1', email: 'sarah@acme.com', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_SECRET,
    );
    const req = { headers: { authorization: `Bearer ${validToken}` } } as unknown as RequestWithUser;
    const { context } = createMockContext(req as unknown as Record<string, unknown>);
    const result = jwtGuard.canActivate(context);
    assert(
      result === true && req.user.id === 'usr_sarah_1' && req.user.email === 'sarah@acme.com',
      'Valid JWT token verified and user context attached to request',
    );
  } catch (err: any) {
    assert(false, `Valid JWT threw unexpected error: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // Mock Prisma for Tenant Isolation Tests
  // --------------------------------------------------------------------------
  // In-memory membership database for isolated verification:
  // User 1 belongs ONLY to Workspace A (with WORKSPACE_OWNER role)
  // User 2 belongs ONLY to Workspace A (with VIEWER role)
  // Workspace B is isolated
  const mockMemberships: Record<string, { role: WorkspaceRole; isActive: boolean; workspaceIsActive: boolean }> = {
    'ws_a:usr_sarah_1': { role: WorkspaceRole.WORKSPACE_OWNER, isActive: true, workspaceIsActive: true },
    'ws_a:usr_viewer_2': { role: WorkspaceRole.VIEWER, isActive: true, workspaceIsActive: true },
    'ws_b:usr_other_3': { role: WorkspaceRole.WORKSPACE_OWNER, isActive: true, workspaceIsActive: true },
  };

  const mockPrismaService = {
    workspaceMember: {
      findUnique: async ({ where }: { where: { workspaceId_userId: { workspaceId: string; userId: string } } }) => {
        const key = `${where.workspaceId_userId.workspaceId}:${where.workspaceId_userId.userId}`;
        const found = mockMemberships[key];
        if (!found) return null;
        return {
          workspaceId: where.workspaceId_userId.workspaceId,
          userId: where.workspaceId_userId.userId,
          role: found.role,
          isActive: found.isActive,
          workspace: { isActive: found.workspaceIsActive },
        };
      },
    },
  } as any;

  const workspaceGuard = new WorkspaceMembershipGuard(mockPrismaService);

  // --------------------------------------------------------------------------
  // Check 4: Workspace A Accessing Its Own Resource
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Tenant Access - Authorized Workspace');
  try {
    const req: Partial<RequestWithWorkspace> = {
      user: { id: 'usr_sarah_1', email: 'sarah@acme.com' },
      headers: { 'x-workspace-id': 'ws_a' },
      params: {},
      query: {},
    };
    const { context } = createMockContext(req as Record<string, unknown>);
    const allowed = await workspaceGuard.canActivate(context);
    assert(
      allowed === true && req.workspaceContext?.workspaceId === 'ws_a',
      'User authorized for Workspace A successfully accesses Workspace A',
    );
  } catch (err: any) {
    assert(false, `Workspace A access unexpectedly rejected: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // Check 5: Workspace A User Attempting to Access Workspace B (Cross-Tenant Intrusion)
  // --------------------------------------------------------------------------
  console.log('\nTest 5: Tenant Isolation - Cross-Tenant Intrusion Prevention');
  try {
    // Sarah belongs to ws_a, but supplies x-workspace-id: ws_b
    const req: Partial<RequestWithWorkspace> = {
      user: { id: 'usr_sarah_1', email: 'sarah@acme.com' },
      headers: { 'x-workspace-id': 'ws_b' },
      params: {},
      query: {},
    };
    const { context } = createMockContext(req as Record<string, unknown>);
    await workspaceGuard.canActivate(context);
    assert(false, 'Cross-tenant access must be rejected!');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException && err.message.includes('not an active member'),
      'Cross-tenant access blocked server-side: ForbiddenException (403)',
    );
  }

  // --------------------------------------------------------------------------
  // Check 6: Viewer Attempting a Restricted Operation (RBAC)
  // --------------------------------------------------------------------------
  console.log('\nTest 6: Workspace RBAC - Viewer restricted operation prevention');
  const workspaceRoleGuard = new WorkspaceRoleGuard(new Reflector());
  try {
    const req: Partial<RequestWithWorkspace> = {
      user: { id: 'usr_viewer_2', email: 'viewer@acme.com' },
      workspaceContext: {
        workspaceId: 'ws_a',
        role: WorkspaceRole.VIEWER,
        isOwner: false,
      },
    };

    // Handler requires WORKSPACE_OWNER or WORKSPACE_ADMIN
    const handler = () => {};
    Reflect.defineMetadata(
      REQUIRED_WORKSPACE_ROLES_KEY,
      [WorkspaceRole.WORKSPACE_OWNER, WorkspaceRole.WORKSPACE_ADMIN],
      handler,
    );

    const { context } = createMockContext(req as Record<string, unknown>, { handler });
    workspaceRoleGuard.canActivate(context);
    assert(false, 'Viewer executing admin action must be rejected');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException && err.message.includes('not authorized'),
      'Viewer restricted from admin action: ForbiddenException (403)',
    );
  }

  // --------------------------------------------------------------------------
  // Check 7: Workspace Admin Attempting Platform Operation (Separation of Planes)
  // --------------------------------------------------------------------------
  console.log('\nTest 7: Administrative Plane Separation');
  const platformRoleGuard = new PlatformRoleGuard(new Reflector());
  try {
    // Sarah is a Workspace Owner/Admin, but has NO platformRole on platform endpoint
    const req: Partial<RequestWithUser> = {
      user: { id: 'usr_sarah_1', email: 'sarah@acme.com', platformRole: null },
    };

    const handler = () => {};
    Reflect.defineMetadata(
      REQUIRED_PLATFORM_ROLES_KEY,
      [PlatformRole.PLATFORM_SUPER_ADMIN, PlatformRole.PLATFORM_ADMIN],
      handler,
    );

    const { context } = createMockContext(req as Record<string, unknown>, { handler });
    platformRoleGuard.canActivate(context);
    assert(false, 'Workspace role accessing platform plane must be rejected');
  } catch (err: any) {
    assert(
      err instanceof ForbiddenException && err.message.includes('Platform administrative privileges required'),
      'Customer workspace user barred from Platform Admin plane: ForbiddenException (403)',
    );
  }

  console.log('\n================================================================');
  console.log(`Security & Isolation Results: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});

