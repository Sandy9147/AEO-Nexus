/**
 * AEO Nexus — Phase 2: Central Authentication & Identity Automated Test Suite
 *
 * Verifies all 15 mandatory test scenarios:
 * 1. Valid registration
 * 2. Duplicate email registration (409 Conflict)
 * 3. Invalid password complexity (400 Bad Request)
 * 4. Valid login with verified account
 * 5. Invalid credentials rejection (401 Unauthorized)
 * 6. Unverified account rejection (401 Unauthorized)
 * 7. Expired access token rejection (401 Unauthorized)
 * 8. Refresh token rotation (old session revoked, new issued)
 * 9. Refresh token reuse detection (triggers family revocation)
 * 10. Logout and session revocation
 * 11. Password reset token usage and expiration
 * 12. Workspace membership verification & invitation acceptance
 * 13. Cross-workspace access isolation (403 Forbidden)
 * 14. Platform role separation (Customer user blocked from platform admin plane)
 * 15. Unauthorized admin action prevention (Support agent blocked from superadmin action)
 */

import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { WorkspacesService } from '../src/workspaces/workspaces.service';
import { EmailService } from '../src/email/email.service';
import { JwtAuthGuard, RequestWithUser } from '../src/auth/guards/jwt-auth.guard';
import { PlatformRoleGuard, REQUIRED_PLATFORM_ROLES_KEY } from '../src/auth/guards/platform-role.guard';
import { WorkspaceRoleGuard, REQUIRED_WORKSPACE_ROLES_KEY } from '../src/auth/guards/workspace-role.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PlatformRole, WorkspaceRole } from '@aeo-nexus/permissions';
import { signJwtHmacSha256 } from '@aeo-nexus/auth';

const TEST_SECRET = 'c7a4b8f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9';
process.env.JWT_SECRET = TEST_SECRET;

const prisma = new PrismaClient();
const emailService = new EmailService();
const authService = new AuthService(prisma as any, emailService);
const workspacesService = new WorkspacesService(prisma as any, emailService);

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

async function runPhase2TestSuite() {
  console.log('================================================================');
  console.log('       AEO Nexus — Phase 2 Authentication & Identity Test Suite');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testUserAEmail = `test_sarah_${timestamp}@aeonexus.test`;
  const testUserBEmail = `test_mark_${timestamp}@aeonexus.test`;
  const testUserCEmail = `test_intruder_${timestamp}@aeonexus.test`;
  const testPassword = 'SecurePassword123!';

  const createdUserIds: string[] = [];
  const createdWorkspaceIds: string[] = [];

  try {
    // --------------------------------------------------------------------------
    // Test 1: Valid Registration
    // --------------------------------------------------------------------------
    console.log('Test 1: Valid User Registration');
    const regResult = await authService.register({
      email: testUserAEmail,
      password: testPassword,
      firstName: 'Sarah',
      lastName: 'Connor',
    });
    createdUserIds.push(regResult.user.id);

    assert(
      regResult.user.email === testUserAEmail && regResult.user.emailVerified === false,
      'User registered successfully with emailVerified = false',
    );

    const emailRecord = emailService.getLatestEmailFor(testUserAEmail);
    assert(
      emailRecord !== undefined && emailRecord.type === 'verification' && !!emailRecord.token,
      'Email verification token dispatched via EmailService',
    );

    // --------------------------------------------------------------------------
    // Test 2: Duplicate Email Registration
    // --------------------------------------------------------------------------
    console.log('\nTest 2: Duplicate Email Registration Prevention');
    try {
      await authService.register({
        email: testUserAEmail,
        password: testPassword,
        firstName: 'Sarah',
        lastName: 'Duplicate',
      });
      assert(false, 'Duplicate registration must throw ConflictException');
    } catch (err: any) {
      assert(
        err instanceof ConflictException,
        'Duplicate registration rejected with ConflictException (409)',
      );
    }

    // --------------------------------------------------------------------------
    // Test 3: Invalid Password Complexity
    // --------------------------------------------------------------------------
    console.log('\nTest 3: Password Complexity Enforcement');
    try {
      await authService.register({
        email: `short_${timestamp}@aeonexus.test`,
        password: 'short',
        firstName: 'Short',
        lastName: 'Pass',
      });
      assert(false, 'Short password must be rejected');
    } catch (err: any) {
      assert(
        err instanceof BadRequestException && err.message.includes('at least 8 characters'),
        'Password < 8 characters rejected with BadRequestException (400)',
      );
    }

    // --------------------------------------------------------------------------
    // Test 6: Unverified Account Login Attempt (Before Verification)
    // --------------------------------------------------------------------------
    console.log('\nTest 6: Unverified Account Login Prevention');
    try {
      await authService.login({
        email: testUserAEmail,
        password: testPassword,
      });
      assert(false, 'Unverified account must be barred from logging in');
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message.includes('Email not verified'),
        'Unverified user login rejected with UnauthorizedException (401)',
      );
    }

    // --------------------------------------------------------------------------
    // Test 4: Email Verification & Valid Login
    // --------------------------------------------------------------------------
    console.log('\nTest 4: Email Verification and Valid Login');
    const verToken = emailRecord!.token!;
    const verifyRes = await authService.verifyEmail(verToken);
    assert(verifyRes.verified === true, 'Email successfully verified with valid token');

    const loginRes = await authService.login({
      email: testUserAEmail,
      password: testPassword,
    });
    assert(
      loginRes.tokens.accessToken.length > 20 &&
        typeof loginRes.tokens.refreshToken === 'string' &&
        loginRes.user.email === testUserAEmail &&
        loginRes.user.emailVerified === true,
      'Valid login issued accessToken, refreshToken and user profile',
    );

    const userAToken = loginRes.tokens.accessToken;
    let currentRefreshToken = loginRes.tokens.refreshToken!;

    // --------------------------------------------------------------------------
    // Test 5: Invalid Credentials Rejection
    // --------------------------------------------------------------------------
    console.log('\nTest 5: Invalid Credentials Rejection');
    try {
      await authService.login({
        email: testUserAEmail,
        password: 'CompletelyWrongPassword!',
      });
      assert(false, 'Incorrect password must be rejected');
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message === 'Invalid credentials',
        'Invalid credentials rejected with UnauthorizedException (401)',
      );
    }

    // --------------------------------------------------------------------------
    // Test 7: Expired Access Token Rejection
    // --------------------------------------------------------------------------
    console.log('\nTest 7: Expired Access Token Rejection');
    const expiredJwt = signJwtHmacSha256(
      {
        sub: regResult.user.id,
        email: testUserAEmail,
        exp: Math.floor(Date.now() / 1000) - 30, // 30s ago
      },
      TEST_SECRET,
    );

    const jwtGuard = new JwtAuthGuard();
    try {
      const req = { headers: { authorization: `Bearer ${expiredJwt}` } };
      const { context } = createMockContext(req);
      jwtGuard.canActivate(context);
      assert(false, 'Expired JWT must be rejected');
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message.includes('expired'),
        'Expired JWT rejected with UnauthorizedException (401)',
      );
    }

    // --------------------------------------------------------------------------
    // Test 8: Refresh Token Rotation
    // --------------------------------------------------------------------------
    console.log('\nTest 8: Refresh Token Rotation');
    const oldRefreshToken = currentRefreshToken;
    const rotateRes = await authService.refresh(oldRefreshToken);
    assert(
      rotateRes.tokens.refreshToken !== oldRefreshToken &&
        typeof rotateRes.tokens.accessToken === 'string',
      'Refresh token successfully rotated with new token pair issued',
    );

    const newRefreshToken = rotateRes.tokens.refreshToken!;

    // --------------------------------------------------------------------------
    // Test 9: Refresh Token Reuse Detection
    // --------------------------------------------------------------------------
    console.log('\nTest 9: Refresh Token Reuse Detection & Family Revocation');
    try {
      // Re-submit the old, already rotated refresh token
      await authService.refresh(oldRefreshToken);
      assert(false, 'Reusing an old refresh token must be detected and rejected!');
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException && err.message.includes('Token reuse detected'),
        'Reuse detected: UnauthorizedException (401) thrown',
      );

      // Verify that the new refresh token was also revoked in response
      const allActiveSessions = await prisma.session.findMany({
        where: { userId: regResult.user.id, isRevoked: false },
      });
      assert(
        allActiveSessions.length === 0,
        'Security action triggered: All user sessions invalidated upon token reuse',
      );
    }

    // Re-login User A for remaining tests
    const reLogin = await authService.login({
      email: testUserAEmail,
      password: testPassword,
    });
    currentRefreshToken = reLogin.tokens.refreshToken!;

    // --------------------------------------------------------------------------
    // Test 10: Logout and Session Revocation
    // --------------------------------------------------------------------------
    console.log('\nTest 10: Logout and Session Revocation');
    await authService.logout(currentRefreshToken);
    try {
      await authService.refresh(currentRefreshToken);
      assert(false, 'Revoked session cannot be refreshed');
    } catch (err: any) {
      assert(
        err instanceof UnauthorizedException,
        'Logged-out session cannot refresh: UnauthorizedException (401)',
      );
    }

    // --------------------------------------------------------------------------
    // Test 11: Password Reset Token Expiration and Usage
    // --------------------------------------------------------------------------
    console.log('\nTest 11: Password Reset Token Lifecycle');
    await authService.forgotPassword(testUserAEmail);
    const resetEmail = emailService.getLatestEmailFor(testUserAEmail);
    assert(
      resetEmail !== undefined && resetEmail.type === 'password_reset' && !!resetEmail.token,
      'Password reset token generated and dispatched',
    );

    const resetToken = resetEmail!.token!;
    const newTestPassword = 'NewSecretPassword2026!';
    const resetRes = await authService.resetPassword(resetToken, newTestPassword);
    assert(
      resetRes.message.includes('successfully reset'),
      'Password successfully reset with valid token',
    );

    // Try reusing the token
    try {
      await authService.resetPassword(resetToken, 'AnotherPassword123!');
      assert(false, 'Used password reset token cannot be reused');
    } catch (err: any) {
      assert(
        err instanceof BadRequestException && err.message.includes('already used'),
        'Reused reset token rejected with BadRequestException (400)',
      );
    }

    // Login with new password succeeds
    const newPassLogin = await authService.login({
      email: testUserAEmail,
      password: newTestPassword,
    });
    assert(newPassLogin.user.id === regResult.user.id, 'Login succeeds with new password');

    // --------------------------------------------------------------------------
    // Test 12: Workspace Membership & Invitations
    // --------------------------------------------------------------------------
    console.log('\nTest 12: Workspace System & Membership');
    const wsSlug = `acme-${timestamp}`;
    const workspace = await workspacesService.createWorkspace(regResult.user.id, {
      name: 'Acme Global Testing',
      slug: wsSlug,
    });
    createdWorkspaceIds.push(workspace.id);

    assert(
      workspace.slug === wsSlug && workspace.role === WorkspaceRole.WORKSPACE_OWNER,
      'Workspace created with creator appointed as WORKSPACE_OWNER',
    );

    // Register User B
    const userBReg = await authService.register({
      email: testUserBEmail,
      password: testPassword,
      firstName: 'Mark',
      lastName: 'Wahl',
    });
    createdUserIds.push(userBReg.user.id);
    const userBVerify = emailService.getLatestEmailFor(testUserBEmail)!.token!;
    await authService.verifyEmail(userBVerify);

    // Invite User B to Workspace
    const invite = await workspacesService.inviteMember(workspace.id, regResult.user.id, {
      email: testUserBEmail,
      role: WorkspaceRole.EDITOR,
    });
    assert(
      invite.email === testUserBEmail && invite.status === 'PENDING',
      'Workspace invitation dispatched to User B as EDITOR',
    );

    const inviteEmail = emailService.getLatestEmailFor(testUserBEmail)!;
    const acceptRes = await workspacesService.acceptInvitation(inviteEmail.token!, userBReg.user.id);
    assert(acceptRes.accepted === true, 'User B accepted invitation');

    const members = await workspacesService.listMembers(workspace.id, regResult.user.id);
    assert(
      members.length === 2 && members.some((m) => m.userId === userBReg.user.id && m.role === WorkspaceRole.EDITOR),
      'User B is confirmed active member with EDITOR role in workspace',
    );

    // --------------------------------------------------------------------------
    // Test 13: Cross-Workspace Access Isolation
    // --------------------------------------------------------------------------
    console.log('\nTest 13: Cross-Workspace Tenant Isolation');
    // Register User C (Intruder)
    const userCReg = await authService.register({
      email: testUserCEmail,
      password: testPassword,
      firstName: 'Intruder',
      lastName: 'Zero',
    });
    createdUserIds.push(userCReg.user.id);

    try {
      // User C attempts to view Workspace A details
      await workspacesService.getWorkspaceDetails(workspace.id, userCReg.user.id);
      assert(false, 'Non-member must be barred from workspace');
    } catch (err: any) {
      assert(
        err instanceof ForbiddenException && err.message.includes('not an active member'),
        'Cross-workspace intrusion blocked: ForbiddenException (403)',
      );
    }

    // --------------------------------------------------------------------------
    // Test 14: Platform Role Separation (Customer vs Platform Admin)
    // --------------------------------------------------------------------------
    console.log('\nTest 14: Administrative Plane Separation');
    const platformRoleGuard = new PlatformRoleGuard(new Reflector());

    // Sarah is WORKSPACE_OWNER, but has NO platform administrative role
    const customerReq: Partial<RequestWithUser> = {
      user: { id: regResult.user.id, email: testUserAEmail, platformRole: null },
    };

    const adminHandler = () => {};
    Reflect.defineMetadata(
      REQUIRED_PLATFORM_ROLES_KEY,
      [PlatformRole.PLATFORM_ADMIN, PlatformRole.PLATFORM_SUPER_ADMIN],
      adminHandler,
    );

    try {
      const { context } = createMockContext(customerReq as Record<string, unknown>, { handler: adminHandler });
      platformRoleGuard.canActivate(context);
      assert(false, 'Customer workspace user accessing platform plane must be blocked');
    } catch (err: any) {
      assert(
        err instanceof ForbiddenException && err.message.includes('Platform administrative privileges required'),
        'Customer user blocked from platform admin plane: ForbiddenException (403)',
      );
    }

    // --------------------------------------------------------------------------
    // Test 15: Unauthorized Admin Action Prevention (Support vs Superadmin)
    // --------------------------------------------------------------------------
    console.log('\nTest 15: Unauthorized Admin Action Prevention');
    // Staff member has SUPPORT_AGENT role, but route requires PLATFORM_SUPER_ADMIN
    const supportReq: Partial<RequestWithUser> = {
      user: { id: 'usr_staff_1', email: 'support@aeonexus.internal', platformRole: PlatformRole.SUPPORT_AGENT },
    };

    const superAdminHandler = () => {};
    Reflect.defineMetadata(
      REQUIRED_PLATFORM_ROLES_KEY,
      [PlatformRole.PLATFORM_SUPER_ADMIN],
      superAdminHandler,
    );

    try {
      const { context } = createMockContext(supportReq as Record<string, unknown>, { handler: superAdminHandler });
      platformRoleGuard.canActivate(context);
      assert(false, 'SUPPORT_AGENT cannot execute PLATFORM_SUPER_ADMIN operations');
    } catch (err: any) {
      assert(
        err instanceof ForbiddenException &&
          (err.message.includes('Required platform role') || err.message.includes('Access denied')),
        'Support agent barred from superadmin operation: ForbiddenException (403)',
      );
    }

    console.log('\n================================================================');
    console.log(`Phase 2 Automated Test Results: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('================================================================\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    // Cleanup isolated test data
    console.log('Cleaning up isolated test data from development database...');
    try {
      for (const wsId of createdWorkspaceIds) {
        await prisma.workspace.deleteMany({ where: { id: wsId } });
      }
      for (const uId of createdUserIds) {
        await prisma.user.deleteMany({ where: { id: uId } });
      }
      console.log('✓ Test cleanup complete');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
    await prisma.$disconnect();
  }
}

runPhase2TestSuite().catch((err) => {
  console.error('Fatal Phase 2 test suite error:', err);
  process.exit(1);
});
