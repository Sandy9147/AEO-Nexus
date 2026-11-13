# AEO Nexus — Central Authentication & Identity System Architecture

**Document Version:** 1.0.0  
**Phase:** Phase 2  
**Status:** Implemented & Verified  
**Primary Database:** Neon Serverless PostgreSQL (Prisma ORM)  
**Backend:** NestJS (`apps/api`)  

---

## 1. System Overview

AEO Nexus implements a **centralized single-identity architecture** where all client applications connect to a single authoritative backend authentication service located in `apps/api`. No portal or application maintains a secondary user database or implements independent authentication mechanisms.

### Application Integration Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT TIERS                                  │
├─────────────────────┬───────────────────┬─────────────────────┬─────────────────┤
│ Customer Dashboard  │  Agency Portal    │ Admin / Superadmin  │ Flutter Mobile  │
│ (apps/customer-web) │ (apps/agency-web) │ (admin/superadmin)  │  (apps/mobile)  │
└──────────┬──────────┴─────────┬─────────┴──────────┬──────────┴────────┬────────┘
           │                    │                    │                   │
           │ (HTTPS / JSON API) │                    │                   │
           ▼                    ▼                    ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       CENTRAL REST API (apps/api - NestJS)                      │
│                                                                                 │
│  - /auth/register              - /auth/refresh           - /workspaces          │
│  - /auth/login                 - /auth/me                - /workspaces/:id      │
│  - /auth/verify-email          - /auth/sessions          - /workspaces/:id/inv..│
│  - /auth/forgot-password       - /auth/logout                                   │
│  - /auth/reset-password        - /auth/sessions/:id                             │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
           ┌────────────────────────────┴───────────────────────────┐
           ▼                                                        ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       Neon PostgreSQL Database       │  │             Redis Engine             │
│  - Users & Credentials (Bcrypt 12)   │  │  - Queue processing (BullMQ)         │
│  - Sessions & SHA-256 Hashed Tokens  │  │  - Rate limiting caching             │
│  - Workspaces & Tenant Memberships   │  └──────────────────────────────────────┘
│  - Audit Logs & Security Events      │
└──────────────────────────────────────┘
```

---

## 2. Token Lifecycle & Session Architecture

### 2.1 Dual-Token Pattern

1. **Access Token (Short-lived, Stateless):**
   - **Lifespan:** 15 minutes (`900` seconds).
   - **Format:** JSON Web Token (JWT) signed with HMAC-SHA256 (`JWT_SECRET`).
   - **Payload Claims:**
     - `sub`: User ID (`UUIDv4`).
     - `email`: User email address.
     - `platformRole`: User's global platform role (`PlatformRole`).
     - `workspaceId`: Active workspace ID (optional).
     - `workspaceRole`: Role within the active workspace (optional).
     - `permissions`: Consolidated array of granular permission strings.
   - **Transmission:** HTTP Authorization header: `Bearer <token>`.

2. **Refresh Token (Long-lived, Stateful, Rotated):**
   - **Lifespan:** 7 days (`604,800` seconds).
   - **Format:** Cryptographically secure 64-character hexadecimal string (`crypto.randomBytes(32)`).
   - **Storage:** Only the SHA-256 hash (`crypto.createHash('sha256')`) is persisted in the Neon `Session` table.
   - **Rotation:** Each refresh operation immediately issues a brand-new refresh token and revokes/replaces the previous token.
   - **Transmission:**
     - **Web Browsers:** Sent in an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie named `aeo_refresh_token`.
     - **Mobile Clients:** Stored securely via iOS Keychain / Android Keystore (`FlutterSecureStorage`) and passed in the `x-refresh-token` header or request body.

### 2.2 Refresh Token Rotation & Family Reuse Detection

To prevent token replay attacks if a refresh token is intercepted:
1. When `/auth/refresh` is called, the database matches the hashed token within active sessions.
2. If a valid active session is found:
   - A new refresh token is generated and hashed.
   - The session record is updated with the new hash and extended expiration.
   - A new access token is minted.
3. **Reuse Detection (Compromise Mitigation):** If an expired, already rotated, or revoked refresh token is presented:
   - The server detects a potential compromise.
   - **All active sessions for that user are immediately revoked.**
   - A high-severity security audit event (`REFRESH_TOKEN_REUSE_DETECTED`) is logged.
   - An `HTTP 401 Unauthorized` is returned, forcing full re-authentication.

### 2.3 Session Revocation

- **Single Session Logout (`POST /auth/logout`):** Deletes the session associated with the current refresh token and clears the `aeo_refresh_token` cookie.
- **Specific Session Revocation (`DELETE /auth/sessions/:id`):** Allows users to revoke access from a specific device or browser listed under `/auth/sessions`.
- **Global Revocation (Password Reset):** When a user successfully resets their password via `/auth/reset-password`, **all** active sessions are terminated across all devices.

---

## 3. Role-Based Access Control (RBAC) & Tenant Isolation

AEO Nexus cleanly decouples **Platform Roles**, **Workspace Roles**, and **Agency Roles**.

### 3.1 Role Hierarchy

```
                      ┌──────────────────────┐
                      │    Identity User     │
                      └──────────┬───────────┘
                                 │
         ┌───────────────────────┼────────────────────────┐
         ▼                       ▼                        ▼
┌──────────────────┐   ┌───────────────────┐    ┌──────────────────┐
│  Platform Role   │   │  Workspace Role   │    │   Agency Role    │
├──────────────────┤   ├───────────────────┤    ├──────────────────┤
│ PLATFORM_SUPER_..│   │ WORKSPACE_OWNER   │    │ AGENCY_OWNER     │
│ PLATFORM_ADMIN   │   │ WORKSPACE_ADMIN   │    │ AGENCY_ADMIN     │
│ SUPPORT_AGENT    │   │ WORKSPACE_MANAGER │    │ AGENCY_MANAGER   │
│ BILLING_OPERATOR │   │ EDITOR            │    │ AGENCY_EDITOR    │
│                  │   │ VIEWER            │    │ AGENCY_CLIENT    │
└──────────────────┘   └───────────────────┘    └──────────────────┘
```

### 3.2 Context Guards

1. **`JwtAuthGuard`:** Validates JWT signature, expiration, and ensures user exists and is active.
2. **`PlatformRoleGuard`:** Enforces platform privileges for admin/superadmin operations (`@RequirePlatformRoles(PlatformRole.PLATFORM_ADMIN, ...)`).
3. **`WorkspaceRoleGuard`:** Evaluates membership in the specific tenant workspace supplied in `:workspaceId` or headers, verifying that the user holds the minimum required role.
4. **Sole Owner Protection:** A workspace must always retain at least one `WORKSPACE_OWNER`. The API strictly blocks removing or demoting the last remaining owner.

---

## 4. API Endpoints & Request Contracts

| Method | Endpoint | Access | Description | Rate Limit |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new user account; sends email verification token | 10 req / 60s |
| `POST` | `/auth/login` | Public | Authenticate with email/password; returns JWT + sets cookie | 10 req / 60s |
| `POST` | `/auth/refresh` | Public / Cookie | Rotate refresh token and issue new 15m access token | 30 req / 60s |
| `POST` | `/auth/logout` | Authenticated | Revoke current session and clear refresh cookie | 60 req / 60s |
| `POST` | `/auth/verify-email` | Public | Confirm email address with token | 10 req / 60s |
| `POST` | `/auth/resend-verification` | Public | Resend email verification token | 5 req / 60s |
| `POST` | `/auth/forgot-password` | Public | Request password reset email | 5 req / 60s |
| `POST` | `/auth/reset-password` | Public | Reset password with token; revokes all sessions | 5 req / 60s |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile and platform permissions | 120 req / 60s |
| `GET` | `/auth/sessions` | Authenticated | List all active sessions with device/IP metadata | 60 req / 60s |
| `DELETE` | `/auth/sessions/:id` | Authenticated | Revoke specific session by ID | 60 req / 60s |
| `POST` | `/workspaces` | Authenticated | Create a new tenant workspace (creator becomes owner) | 30 req / 60s |
| `GET` | `/workspaces` | Authenticated | List workspaces accessible to current user | 120 req / 60s |
| `GET` | `/workspaces/:id` | Authenticated | Fetch workspace details and member list | 120 req / 60s |
| `PATCH` | `/workspaces/:id` | Workspace Admin | Update workspace name or settings | 60 req / 60s |
| `POST` | `/workspaces/:id/invitations` | Workspace Admin | Invite a new user to the workspace | 30 req / 60s |
| `POST` | `/workspaces/invitations/:token/accept` | Authenticated | Accept workspace membership invitation | 30 req / 60s |
| `POST` | `/workspaces/invitations/:token/decline` | Authenticated | Decline workspace membership invitation | 30 req / 60s |
| `PATCH` | `/workspaces/:id/members/:userId` | Workspace Owner | Update member role (with sole owner guard) | 30 req / 60s |
| `DELETE` | `/workspaces/:id/members/:userId` | Workspace Owner | Remove member from workspace | 30 req / 60s |

---

## 5. Security & Cryptographic Standards

1. **Password Hashing:**
   - **Algorithm:** Bcrypt with **12 salt rounds**.
   - Timing-safe comparison prevents user enumeration via response latency.
2. **Opaque Tokens:**
   - All email verification, password reset, and refresh tokens are generated using `crypto.randomBytes(32).toString('hex')` (256 bits of entropy).
   - Only the **SHA-256** hash is stored in PostgreSQL. Raw tokens are never logged or persisted.
3. **Sliding-Window Rate Limiter:**
   - `RateLimiterGuard` protects brute-force sensitive endpoints (`/auth/login`, `/auth/forgot-password`, `/auth/register`).
   - Combines client IP address and target email to throttle abuse.
4. **Email Delivery Safety:**
   - Supports production providers (SMTP / Resend).
   - In local development without configured SMTP credentials, emails are written to a secure backend debug stream without attempting external connections or using mocks.

