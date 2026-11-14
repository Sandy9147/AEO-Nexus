# AEO Nexus — Phase 7A.2 Operational Security & Challenge Lifecycle Hardening Report

## Executive Summary
This report documents the implementation and verification of **Phase 7A.2: MFA Operational Security & Challenge Lifecycle Hardening** for the AEO Nexus platform.

Phase 7A.2 eliminates operational vulnerabilities identified during the Phase 7A.1 review by establishing:
1. **Strict Key Independence in Production**: MFA encryption keys (`MFA_ENCRYPTION_KEY`) and recovery peppers (`MFA_RECOVERY_PEPPER`) must be explicitly supplied in production environments. Silent fallback to derivations from `JWT_SECRET` is strictly prevented, ensuring that JWT secret rotations cannot destroy or lock out access to encrypted MFA credentials.
2. **Multi-Version Key Rotation**: Support for versioned key envelopes (`v1`, `v2`, etc.) and multi-key decryption dictionaries (`MFA_ENCRYPTION_KEYS`) enables zero-downtime key rotation.
3. **Persisted One-Time MFA Challenge Lifecycle**: Challenges are persisted in the Neon PostgreSQL `mfa_challenges` table with unique cryptographically random UUID identifiers (`jti`), purpose constraints (`MFA_LOGIN` vs `MFA_SETUP`), short expirations (5 minutes), and atomic conditional consumption (`consumedAt: now`) that eliminates concurrent replay and replay across the 5-minute window.
4. **Transparent Recovery Code Migration & Regeneration**: Support for legacy unkeyed SHA-256 codes alongside modern keyed HMAC-SHA256 hashes, single-use atomic consumption, and a dedicated endpoint (`POST /auth/mfa/regenerate-recovery-codes`) allowing users to refresh their recovery codes.
5. **Real HTTP Integration & Service Test Coverage**: 100% pass rate across 70 security, cryptographic, operational, and live HTTP test scenarios.

---

## 1. Production Key Management & Independence

### 1.1 Fatal Startup Checks on Production
In `apps/api/src/auth/mfa.service.ts`, the service implements NestJS's `OnModuleInit` lifecycle hook:
```ts
public onModuleInit(): void {
  this.validateProductionKeys();
}

public validateProductionKeys(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const encKey = process.env.MFA_ENCRYPTION_KEY;
  const pepper = process.env.MFA_RECOVERY_PEPPER;

  if (isProd) {
    if (!encKey || encKey.trim().length === 0) {
      throw new Error(
        'FATAL STARTUP ERROR: MFA_ENCRYPTION_KEY is required in production! ' +
        'Set a 32-byte (64 hex characters or 44 base64 characters) key.'
      );
    }
    this.parseAndValidateKey(encKey);

    if (!pepper || pepper.trim().length < 32) {
      throw new Error(
        'FATAL STARTUP ERROR: MFA_RECOVERY_PEPPER is required in production! ' +
        'Provide an independent high-entropy secret of at least 32 characters.'
      );
    }
  }
}
```

### 1.2 Strict Key Format & Encoding Validation
All configured encryption keys must be exactly 32 bytes (256 bits):
- **Hexadecimal**: Exactly 64 characters matching `/^[0-9a-fA-F]{64}$/`.
- **Base64**: Exactly 44 characters decoded to exactly 32 bytes.
- Keys violating these criteria throw immediate validation errors and prevent boot.

### 1.3 Key Rotation Architecture
The system supports planned key rotation without maintenance windows:
- Ciphertexts are stored as versioned envelopes: `v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
- The active version is controlled by `MFA_KEY_VERSION` (default `v1`).
- Historical key versions can be provided via `MFA_ENCRYPTION_KEYS` as a JSON string:
  ```json
  {"v1": "64_hex_key_1...", "v2": "64_hex_key_2..."}
  ```
- When decrypting, `MfaService` reads the envelope version tag and retrieves the corresponding key. When encrypting, it always writes using the active key version.

### 1.4 Decoupling from JWT Secret Rotation
The MFA keys are completely isolated from `JWT_SECRET`. Rotating `JWT_SECRET` only invalidates active access/challenge JWTs, while all encrypted TOTP secrets remain accessible and verifiable without interruption.

---

## 2. One-Time Persisted MFA Challenge Lifecycle

### 2.1 Database Schema
A new table `mfa_challenges` was created in Neon PostgreSQL via Prisma migration `20261114120000_mfa_challenge_lifecycle`:
```prisma
enum MfaChallengePurpose {
  MFA_LOGIN
  MFA_SETUP
}

model MfaChallenge {
  id            String              @id @default(uuid())
  userId        String
  challengeId   String              @unique
  purpose       MfaChallengePurpose
  expiresAt     DateTime
  consumedAt    DateTime?
  invalidatedAt DateTime?
  createdAt     DateTime            @default(now())

  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose])
  @@index([challengeId])
  @@index([expiresAt])
  @@map("mfa_challenges")
}
```

### 2.2 Challenge Creation & Issuance
When an administrative user signs in or an enrolled user submits their password:
1. A cryptographically random UUID is generated (`challengeId = crypto.randomUUID()`).
2. Any previously pending unconsumed challenges for that user and purpose are marked invalidated (`invalidatedAt: new Date()`).
3. A new `MfaChallenge` record is inserted with `expiresAt = now + 5 minutes`.
4. The challenge ticket JWT is signed containing:
   - `sub`: User ID
   - `jti`: `challengeId`
   - `type`: `'mfa_challenge'` or `'mfa_setup_challenge'`
   - `exp`: 5 minutes

### 2.3 Atomic Conditional Consumption
When `POST /auth/mfa/login` or `POST /auth/mfa/admin-setup` is called, the challenge is consumed using an atomic conditional update:
```ts
const challengeUpdate = await this.prisma.mfaChallenge.updateMany({
  where: {
    challengeId: payload.jti,
    userId: user.id,
    purpose: MfaChallengePurpose.MFA_LOGIN,
    consumedAt: null,
    invalidatedAt: null,
    expiresAt: { gt: now },
  },
  data: {
    consumedAt: now,
  },
});

if (challengeUpdate.count === 0) {
  throw new UnauthorizedException('MFA challenge has expired, been consumed, or is invalid');
}
```
If two concurrent requests submit the same challenge token simultaneously, the PostgreSQL database serializes the update: exactly one transaction receives `count === 1` and proceeds, while the duplicate receives `count === 0` and is immediately rejected with HTTP 401 Unauthorized.

### 2.4 Invalidation After Success
Upon successful MFA verification, all active challenges for that user are marked invalidated, preventing any outstanding tickets from being used.

---

## 3. Recovery Code Migration Strategy

### 3.1 Transparent Dual-Verification
To ensure existing users are never locked out of their accounts during the transition from legacy SHA-256 to keyed HMAC-SHA256:
- The verifier calculates both the keyed HMAC-SHA256 and the legacy unkeyed SHA-256 of the normalized submitted code.
- If the legacy hash matches a stored code in `user.mfaRecoveryCodes`:
  - The code is atomically consumed and removed from the array.
  - The response flags `isLegacy: true`.
  - The user successfully logs in without hindrance.

### 3.2 Recovery Code Regeneration
Users can regenerate a fresh set of 10 keyed HMAC-SHA256 recovery codes at any time via:
- **Route**: `POST /auth/mfa/regenerate-recovery-codes`
- **Protection**: `JwtAuthGuard`
- **Behavior**: Generates 10 new high-entropy codes, hashes them with HMAC-SHA256 + pepper, atomically updates `user.mfaRecoveryCodes`, and returns the plaintext codes to the user once.

---

## 4. Test Verification & Results

### 4.1 Phase 7A.2 MFA Operational Suite (`test:phase7a2-ops`)
File: `apps/api/scripts/test-phase7a2-mfa-operational-suite.ts`
- **Total Scenarios**: 13
- **Passed**: 13
- **Failed**: 0

| # | Scenario Description | Status |
|---|---|---|
| 1 | Missing `MFA_ENCRYPTION_KEY` in production halts startup with fatal error | PASS |
| 2 | Missing `MFA_RECOVERY_PEPPER` in production halts startup with fatal error | PASS |
| 3 | Invalid key format (invalid hex, short length, non-base64) strictly rejected | PASS |
| 4 | JWT secret rotation does not impair MFA secret decryption (key independence) | PASS |
| 5 | Versioned key rotation strategy: v1 secret decrypts with v1 key; new encryption uses v2 key | PASS |
| 6 | Decryption with mismatched key fails safely with authentication failure | PASS |
| 7 | Admin login creates persisted challenge record with UUID jti in `mfa_challenges` | PASS |
| 8 | Setup challenge is consumed atomically and cannot be reused | PASS |
| 9 | Concurrent duplicate challenge submissions: exactly one succeeds, second rejected | PASS |
| 10 | Challenge purpose confusion rejected (mfa_setup_challenge cannot call mfaLogin) | PASS |
| 11 | Expired challenge record in database rejected even if JWT has not expired | PASS |
| 12 | Legacy SHA-256 recovery codes validated, consumed atomically, and identified as legacy | PASS |
| 13 | User can regenerate 10 fresh recovery codes atomically replacing old codes | PASS |

---

### 4.2 Phase 7A.2 Real HTTP Integration Suite (`test:phase7a2-http`)
File: `apps/api/scripts/test-phase7a2-http-integration-suite.ts`
Tests a live NestJS HTTP server listening on an ephemeral port with real controllers, guards, filters, body parsers, cookie serialization, and Neon PostgreSQL database.
- **Total Scenarios**: 11
- **Passed**: 11
- **Failed**: 0

| # | Scenario Description | Status |
|---|---|---|
| 1 | `POST /auth/login` returns MFA setup challenge and creates 0 sessions in DB | PASS |
| 2 | `GET /auth/me` with challenge token strictly rejected with HTTP 401 | PASS |
| 3 | `POST /auth/mfa/admin-setup` verifies TOTP, returns tokens, and sets refresh cookie | PASS |
| 4 | `POST /auth/mfa/admin-setup` replaying consumed ticket returns HTTP 401 | PASS |
| 5 | `POST /auth/login` for enrolled user yields regular `mfa_challenge` ticket | PASS |
| 6 | `POST /auth/mfa/login` with valid TOTP code succeeds and establishes session | PASS |
| 7 | `POST /auth/mfa/login` replaying consumed ticket returns HTTP 401 | PASS |
| 8 | `POST /auth/mfa/login` with recovery code succeeds and decrements remaining codes | PASS |
| 9 | `POST /auth/mfa/disable` returns HTTP 400 when invoked on administrative account | PASS |
| 10 | `POST /auth/mfa/regenerate-recovery-codes` returns 10 fresh codes over HTTP | PASS |
| 11 | `POST /auth/mfa/login` with missing code or invalid payload returns HTTP 400 | PASS |

---

### 4.3 Regression Test Results
- **Phase 7A.1 MFA Cryptographic Hardening Suite (`test:phase7a1`)**: 16 of 16 Scenarios PASSED.
- **Phase 7A Full Security Verification Suite (`test:phase7a`)**: 30 of 30 Scenarios PASSED.
- **API TypeScript Typecheck (`typecheck`)**: PASSED with 0 errors (`tsc --noEmit`).

---

## 5. Operational Procedures

### 5.1 Generating Production Secrets
Run the following commands using OpenSSL:
```bash
# Generate 32-byte (256-bit) encryption key for MFA secrets
openssl rand -hex 32

# Generate high-entropy recovery code pepper
openssl rand -hex 32
```

### 5.2 Performing Zero-Downtime Key Rotation
When rotating `MFA_ENCRYPTION_KEY`:
1. Generate a new 32-byte key: `NEW_KEY=$(openssl rand -hex 32)`.
2. Configure environment variables in deployment:
   ```env
   MFA_KEY_VERSION="v2"
   MFA_ENCRYPTION_KEY="<NEW_KEY>"
   MFA_ENCRYPTION_KEYS='{"v1":"<OLD_KEY>","v2":"<NEW_KEY>"}'
   ```
3. Deploy updated API instances.
4. Old secrets decrypt seamlessly using `v1` from `MFA_ENCRYPTION_KEYS`. All new or updated MFA enrollments write using `v2` and `NEW_KEY`.
5. Once all accounts have authenticated or an offline re-encryption script runs, decommission `v1`.

### 5.3 Disaster Recovery & Backup Restoration
- Encrypted MFA secrets stored in database backups cannot be decrypted without the corresponding `MFA_ENCRYPTION_KEY`.
- Always store `MFA_ENCRYPTION_KEY`, `MFA_KEY_VERSION`, and `MFA_RECOVERY_PEPPER` in a dedicated enterprise secret manager (e.g. AWS Secrets Manager, HashiCorp Vault, Google Cloud Secret Manager) separate from PostgreSQL snapshots.

---

## 6. Files Changed & Added
- `apps/api/prisma/schema.prisma`: Added `MfaChallengePurpose` enum and `MfaChallenge` model; relation on `User.mfaChallenges`.
- `apps/api/prisma/migrations/20261114120000_mfa_challenge_lifecycle/migration.sql`: Deployed to Neon PostgreSQL database.
- `apps/api/src/auth/mfa.service.ts`: Implemented `validateProductionKeys()`, `parseAndValidateKey()`, multi-version rotation, and transparent recovery migration.
- `apps/api/src/auth/auth.service.ts`: Challenge persistence with UUID `jti`, atomic conditional challenge consumption, purpose matching, and code regeneration.
- `apps/api/src/auth/auth.controller.ts`: Added `POST /auth/mfa/regenerate-recovery-codes`.
- `apps/api/scripts/test-phase7a2-mfa-operational-suite.ts`: 13 operational test scenarios.
- `apps/api/scripts/test-phase7a2-http-integration-suite.ts`: 11 live HTTP integration test scenarios.
- `apps/api/package.json`: Registered test runner scripts.
- `apps/api/.env.example`: Documented all MFA environment variables and format requirements.
- `docs/security-architecture.md`: Updated with operational key management and persisted challenge lifecycle architecture.
- `docs/security-remediation-register.md`: Registered Phase 7A.2 findings as resolved and verified.
- `docs/phase-7a2-operational-security-report.md`: Created comprehensive operational report.

---

## 7. Status Sign-Off
Phase 7A.2 is **COMPLETE**, verified against remote Neon PostgreSQL, and ready for production deployment.
No further phases (such as Phase 7B) have been initiated.
