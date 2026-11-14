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

## 3. Multi-Factor Authentication (MFA / 2FA) & Operational Hardening

### 3.1 Authenticated Encryption at Rest (AES-256-GCM) & Key Independence
- **Algorithm**: AES-256-GCM authenticated encryption for all TOTP secrets stored in PostgreSQL (`mfa_secret`).
- **Initialization Vector (Nonce)**: 96-bit (12-byte) cryptographically secure random IV generated per encryption operation via `crypto.randomBytes(12)`. IVs are never reused.
- **Authentication Tag**: 128-bit (16-byte) GCM authentication tag authenticating both ciphertext integrity and payload structure.
- **Storage Envelope**: Versioned envelope format: `v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
- **Enforced Production Key Independence**:
  - In production (`NODE_ENV=production`), `MFA_ENCRYPTION_KEY` is **strictly required** and must be exactly 32 bytes (64 hex characters or 44 Base64 characters).
  - Production never falls back to deriving MFA keys from `JWT_SECRET`. This guarantees that rotating JWT signing secrets cannot render existing encrypted MFA secrets inaccessible.
  - Startup checks (`validateProductionKeys()` in `onModuleInit`) immediately abort boot if keys are missing or improperly formatted.
  - Development fallback is permitted only when `NODE_ENV !== 'production'`.
- **Multi-Version Key Rotation Strategy**:
  - Secrets are tagged with an envelope version prefix (`v1:`, `v2:`).
  - Active version is configured via `MFA_KEY_VERSION` (default `v1`).
  - The service accepts multi-version keys via `MFA_ENCRYPTION_KEYS` JSON map (`{"v1": "...", "v2": "..."}`).
  - When rotating keys, existing secrets decrypt cleanly using their version-matched key, while all new encryptions write using the new active key version.
- **Tamper Resistance**: Tampered ciphertexts or altered authentication tags immediately throw exceptions; silent fallbacks to unencrypted plaintext are strictly prohibited.
- **Zero-Downtime Migration**: Legacy unencrypted secrets are automatically detected, decrypted, and upgraded in-place to authenticated encryption on first authentication.

### 3.2 RFC 6238 TOTP Engine & Counter-Based Replay Protection
- **Standard**: RFC 6238 Time-Based One-Time Password algorithm with RFC 4648 Base32 secret encoding.
- **Secret Generation**: 160-bit (20-byte) cryptographically secure random secret yielding 32-character Base32 string.
- **URI & QR Provisioning**: Formats standard `otpauth://totp/AEO%20Nexus:<email>?secret=<secret>&issuer=AEO%20Nexus&algorithm=SHA1&digits=6&period=30` compatible with Google Authenticator, 1Password, and Apple Keychain.
- **Drift Tolerance Window**: Calculates RFC 6238 counter step $C = \lfloor \text{timestampMs} / 1000 / 30 \rfloor$ and tests candidates $[C, C-1, C+1]$ (+/- 30 seconds drift tolerance).
- **Time-Step Counter Tracking**: Replaces simple string code matching with RFC 6238 counter step verification (`mfa_last_used_step` in PostgreSQL). Any candidate counter step $S \le \text{lastAcceptedStep}$ is strictly rejected, preventing replay attacks across the entire drift window.
- **Race Condition Resistance**: Atomic row-level conditional database update:
  ```ts
  const updateRes = await prisma.user.updateMany({
    where: {
      id: user.id,
      OR: [{ mfaLastUsedStep: null }, { mfaLastUsedStep: { lt: acceptedStep } }]
    },
    data: { mfaLastUsedStep: acceptedStep, mfaLastUsedCode: code }
  });
  if (updateRes.count === 0) throw new UnauthorizedException('MFA time step has already been consumed (replay prevention)');
  ```
  In concurrent submission race conditions, exactly one transaction succeeds and the duplicate request is rejected.

### 3.3 Keyed Backup Recovery Codes (HMAC-SHA256) & Transparent Migration
- **Generation**: 10 cryptographically random codes (`XXXXXX-XXXXXX` generated via 6 hex bytes).
- **Keyed Hashing**: Keyed HMAC-SHA256 using server-side pepper (`MFA_RECOVERY_PEPPER`, minimum 32 characters).
- **Transparent Migration Strategy**:
  - Verifier dynamically checks stored hash format.
  - Supports both modern HMAC-SHA256 hashes (`hmac:v1:...` and raw HMAC) and legacy unkeyed SHA-256 hashes.
  - Upon successful verification of a legacy hash, the system consumes the code atomically and flags `isLegacy: true` so the account can be queued for automatic hash upgrading.
- **Atomic Consumption**: Atomic conditional database array update:
  ```ts
  const updateRes = await prisma.user.updateMany({
    where: { id: user.id, mfaRecoveryCodes: { has: targetHash } },
    data: { mfaRecoveryCodes: remainingHashedCodes }
  });
  if (updateRes.count === 0) throw new UnauthorizedException('Recovery code has already been consumed');
  ```
- **Code Regeneration Endpoint**: Authenticated users can generate 10 fresh HMAC-SHA256 recovery codes via `POST /auth/mfa/regenerate-recovery-codes`, invalidating any old recovery codes in a single atomic transaction. Plaintext codes are never stored and returned only once in the HTTP response.

### 3.4 Persisted One-Time MFA Challenge Lifecycle
- **Vulnerability Addressed**: In-flight JWT challenges (`mfa_challenge`, `mfa_setup_challenge`) could previously be replayed with subsequent TOTP codes within their 5-minute lifespan.
- **Persisted Challenge State**: Challenges are stored in `mfa_challenges` table with:
  - `challengeId`: Cryptographically random unique UUID embedded as `jti` in the challenge JWT.
  - `userId`: Strict foreign key to `User`.
  - `purpose`: `MfaChallengePurpose` enum (`MFA_LOGIN` vs `MFA_SETUP`).
  - `expiresAt`: Short expiration (300 seconds / 5 minutes).
  - `consumedAt`: Timestamp set atomically on consumption.
  - `invalidatedAt`: Timestamp set when superseded by new logins or successful auth.
- **One-Time Atomic Consumption**:
  ```ts
  const challengeUpdate = await prisma.mfaChallenge.updateMany({
    where: {
      challengeId: payload.jti,
      userId: user.id,
      purpose: MfaChallengePurpose.MFA_LOGIN,
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });
  if (challengeUpdate.count === 0) throw new UnauthorizedException('MFA challenge has expired, been consumed, or is invalid');
  ```
- **Purpose Confusion Prevention**: `mfa_setup_challenge` cannot be submitted to `POST /auth/mfa/login`; `mfa_login` cannot be submitted to setup completion.
- **Challenge Token Confinement**: `JwtAuthGuard` explicitly rejects challenge tokens from accessing any protected resource, returning 401 Unauthorized.
- **Zero Session Premature Creation**: Password authentication during MFA challenges creates zero sessions or refresh tokens; session and token creation occurs only upon verified second-factor completion.
- **Administrative MFA Immutability**: Administrative accounts cannot disable MFA (`disableMfa` throws `BadRequestException: MFA is mandatory for administrative accounts and cannot be disabled`).

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
