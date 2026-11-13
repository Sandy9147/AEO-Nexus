# AEO Nexus — Security Architecture & Platform Hardening

## 1. Executive Summary & Security Model
AEO Nexus employs an **enterprise defense-in-depth, zero-trust security architecture** designed for high-assurance multi-tenant operations. The platform enforces multi-layered authorization barriers at the network edge, API gateway, application service layer, asynchronous background worker boundary, and database level.

Every incoming request must authenticate using high-entropy cryptographic credentials and pass through strict authorization guards verifying workspace tenant membership, workspace role permissions, and object-level ownership before access to any business asset, strategy plan, or website publication is granted.

---

## 2. Authentication Architecture & Identity Verification

### 2.1 Password Hashing Configuration
- **Algorithm**: `bcrypt` with work factor 10 (`$2b$10$`).
- **Salt Generation**: Cryptographically secure pseudo-random salt generated per password.
- **Timing Attack Resistance**: Constant-time verification comparisons prevent username or password timing side-channel attacks.

### 2.2 Token Lifecycle & Session Management
- **Short-Lived Access Tokens**:
  - Algorithm: HMAC-SHA256 with 256-bit high-entropy secret (`JWT_SECRET`).
  - Lifespan: 15 minutes (`ACCESS_TOKEN_TTL_SECONDS = 900`).
  - Payload: Contains `sub` (User UUID), `email`, `platformRole`, issuer (`aeo-nexus-api`), and expiration `exp`.
- **Rotated Refresh Tokens & Session Families**:
  - Format: 32-byte cryptographically secure opaque tokens (`crypto.randomBytes(32)`).
  - Storage: SHA-256 hashed value stored in `sessions` table.
  - Rotation: Every call to `POST /auth/refresh` immediately invalidates the consumed refresh token and issues a newly generated token pair.
- **Refresh Token Reuse Detection**:
  - If a previously consumed or expired refresh token is submitted, the system flags token theft or replay.
  - **Remediation**: The entire session family for that user is immediately revoked in Neon PostgreSQL (`isRevoked: true`), and an automated high-priority security alert is dispatched to the user's verified email.

### 2.3 Email Verification & Account Enumeration Protections
- Unverified accounts cannot access authenticated endpoints or obtain session tokens (`emailVerified: true` check).
- Authentication failures return generic `Invalid credentials` error messages without revealing whether the email address exists in the system.

---

## 3. Multi-Factor Authentication (MFA / 2FA)

### 3.1 RFC 6238 TOTP Engine
- **Standard**: RFC 6238 Time-Based One-Time Password algorithm with RFC 4648 Base32 secret encoding.
- **Secret Generation**: 160-bit (20-byte) cryptographically secure random secret yielding 32-character Base32 string.
- **URI & QR Provisioning**: Formats standard `otpauth://totp/AEO%20Nexus:<email>?secret=<secret>&issuer=AEO%20Nexus&algorithm=SHA1&digits=6&period=30` compatible with Google Authenticator, 1Password, and Apple Keychain.
- **Drift Tolerance**: Tolerates +/- 30-second window (3 time steps total: past, current, future) for client clock drift.
- **Replay Attack Protection**: Compares verified code against `mfaLastUsedCode`. Replaying the same 6-digit TOTP within the active 30-second window is rejected immediately.

### 3.2 Single-Use Backup Recovery Codes
- **Generation**: 10 cryptographically random 8-character codes (`XXXX-XXXX`).
- **Storage**: SHA-256 hashed values stored in Prisma `mfa_recovery_codes`. Plaintext codes are displayed to the user only once upon initial enrollment.
- **Consumption**: Upon submission, the matching SHA-256 hash is located, atomically consumed, and permanently removed from the user's recovery array. Subsequent reuse attempts fail immediately.

### 3.3 Mandatory Administrator Enforcement
- Administrative platform roles (`PLATFORM_SUPER_ADMIN`, `PLATFORM_ADMIN`, `SUPERADMIN`) are barred from password-only sign-in.
- Unenrolled administrators receive an ephemeral `mfa_setup_challenge` JWT and must complete TOTP enrollment before gaining platform dashboard access.
- Administrative accounts cannot disable MFA (`disableMfa` throws `BadRequestException: MFA is mandatory for administrative accounts and cannot be disabled`).

---

## 4. Multi-Tenant Isolation & Object-Level Authorization

### 4.1 Tenant Boundaries
- Every database entity (Projects, Tasks, Comments, Asset Folders, Assets, Knowledge Documents, Discover Research, Strategic Plans, Business Goals, Strategic Initiatives, Website Projects, Website Pages, Publications) maintains a strict `workspaceId` foreign key.
- The `WorkspaceMembershipGuard` verifies that the authenticated user is an active member of the targeted workspace before route handling begins.

### 4.2 Cross-Tenant IDOR Protection
- **Task & Project Assignees**: `createTask`, `updateTask`, and `createProject` explicitly verify that any assigned user ID is an active member of the current workspace:
  ```ts
  const member = await this.prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: dto.assignedToId } }
  });
  if (!member || !member.isActive) throw new BadRequestException('Assigned user is not an active member of this workspace');
  ```
- Cross-tenant requests to read, edit, or delete foreign records return `404 Not Found` or `400 Bad Request`, preventing tenant information leakage.

---

## 5. Website Publishing & Gateway Security

### 5.1 Subdomain Governance
- **Reserved Subdomains**: Strict blocklist preventing hijacking of internal services: `admin`, `api`, `auth`, `billing`, `mail`, `dashboard`, `app`, `staging`, `support`, `status`, etc.
- **Format Validation**: Enforces standard RFC 1123 hostname syntax: `^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$`.
- **Collision Protection**: Global uniqueness check on `website_publications` preventing duplicate claimed subdomains across different workspaces.

### 5.2 Content Sanitization & Safe Protocol Filtering
- **Stored XSS Prevention**: All visual website builder content payloads recursively strip `<script>` tags, inline JavaScript handlers (`onclick`, `onmouseover`, `onload`), and null bytes.
- **Safe Protocols**: URLs are checked against an allowlist: `https:`, `http:`, `mailto:`, `tel:`, or safe relative paths (`/`). Unsafe protocols (`javascript:`, `data:`, `vbscript:`) are rejected.
- **Unpublish Guarantee**: Unpublishing a website sets `isPublished: false` and marks active publications inactive, ensuring immediate 404 responses on public routes.

---

## 6. Worker Security & Platform Hardening

### 6.1 Background Job Tenant Boundary Validation
- All BullMQ asynchronous worker processors (`ai-run`, `discover-research`, `plan-generation`, `website-generation`) inspect incoming jobs and verify `workspaceId` validity before executing processing logic:
  ```ts
  if (!job.data.workspaceId || typeof job.data.workspaceId !== 'string' || job.data.workspaceId.trim().length === 0) {
    throw new Error('Tenant boundary violation: job missing valid workspaceId');
  }
  ```

### 6.2 OWASP Security Headers (API Gateway)
The Express HTTP pipeline sets mandatory security headers:
- `X-Frame-Options: DENY` (prevents clickjacking)
- `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (enforces HTTPS)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ...`

### 6.3 DoS & Rate Limiting Protections
- Express body parsing restricted to `10mb` to protect against payload memory exhaustion.
- `RateLimiterGuard` active on sensitive authentication endpoints (`login`, `register`, `refresh`, `mfa/login`, `forgot-password`).

