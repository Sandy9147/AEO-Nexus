/**
 * Verification test for JWT Security & Environment Configuration Validation
 */

import { ApiConfigSchema, validateConfig } from '../packages/config/src';
import { signJwtHmacSha256, verifyJwtHmacSha256 } from '../packages/auth/src';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failCount++;
  }
}

function expectThrow(fn: () => void, testName: string, expectedErrorSnippet?: string) {
  try {
    fn();
    console.error(`  ✗ FAIL: ${testName} (did not throw)`);
    failCount++;
  } catch (err: unknown) {
    const msg = (err as Error)?.message || String(err);
    if (!expectedErrorSnippet || msg.includes(expectedErrorSnippet)) {
      console.log(`  ✓ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(
        `  ✗ FAIL: ${testName} (threw '${msg}', expected snippet '${expectedErrorSnippet}')`,
      );
      failCount++;
    }
  }
}

console.log('================================================================');
console.log('       AEO Nexus — JWT Security & Config Verification');
console.log('================================================================\n');

// --- Test Suite 1: JWT Secret Validation ---
console.log('Suite 1: JWT Secret Validation (packages/config)');

// 1.1 Fails when JWT_SECRET is missing
expectThrow(
  () => {
    validateConfig(ApiConfigSchema, {
      DATABASE_URL: 'postgresql://user:pass@ep-test.neon.tech/db',
    });
  },
  'Fails startup when JWT_SECRET is missing',
  'JWT_SECRET',
);

// 1.2 Fails when JWT_SECRET is less than 32 characters
expectThrow(
  () => {
    validateConfig(ApiConfigSchema, {
      DATABASE_URL: 'postgresql://user:pass@ep-test.neon.tech/db',
      JWT_SECRET: 'short_secret_only_24_chars',
    });
  },
  'Fails startup when JWT_SECRET is < 32 characters',
  'at least 32 characters',
);

// 1.3 Succeeds when valid 32+ character secret provided in development
try {
  const valid = validateConfig(ApiConfigSchema, {
    DATABASE_URL: 'postgresql://user:pass@ep-test.neon.tech/db',
    JWT_SECRET: 'a_secure_dev_secret_that_is_at_least_32_characters_long',
  });
  assert(valid.JWT_SECRET.length >= 32, 'Valid dev secret (>=32 chars) passes validation');
} catch (err: unknown) {
  assert(false, `Valid dev secret threw unexpected error: ${(err as Error).message}`);
}

// 1.4 Fails in production when JWT_SECRET uses development placeholder
expectThrow(
  () => {
    validateConfig(ApiConfigSchema, {
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgresql://neondb_owner:realpassword@ep-prod-1234.us-east-2.aws.neon.tech/neondb?sslmode=require',
      DIRECT_URL:
        'postgresql://neondb_owner:realpassword@ep-prod-1234.us-east-2.aws.neon.tech/neondb?sslmode=require',
      JWT_SECRET: 'dev_jwt_secret_change_in_production_min_32_chars',
    });
  },
  'Fails in production when JWT_SECRET uses development placeholder',
  'CRITICAL',
);

// 1.5 Fails in production when DATABASE_URL uses placeholder
expectThrow(
  () => {
    validateConfig(ApiConfigSchema, {
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb',
      DIRECT_URL:
        'postgresql://neondb_owner:realpassword@ep-prod-1234.us-east-2.aws.neon.tech/neondb',
      JWT_SECRET: 'random_cryptographic_secret_32_characters_long_prod_key_12345',
    });
  },
  'Fails in production when DATABASE_URL has placeholder',
  'CRITICAL',
);

// 1.6 Fails in production when DIRECT_URL is missing
expectThrow(
  () => {
    validateConfig(ApiConfigSchema, {
      NODE_ENV: 'production',
      DATABASE_URL:
        'postgresql://neondb_owner:realpassword@ep-prod-1234.us-east-2.aws.neon.tech/neondb?sslmode=require',
      JWT_SECRET: 'random_cryptographic_secret_32_characters_long_prod_key_12345',
    });
  },
  'Fails in production when DIRECT_URL is missing',
  'DIRECT_URL is required in production/staging',
);

// --- Test Suite 2: Cryptographic HMAC-SHA256 Signing & Verification ---
console.log('\nSuite 2: Cryptographic JWT Operations (packages/auth)');

const secureSecret = 'c7a4b8f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9';

// 2.1 Refuses to sign with secret < 32 characters
expectThrow(
  () => {
    signJwtHmacSha256({ sub: 'user_1' }, 'too_short');
  },
  'signJwtHmacSha256 rejects secret < 32 characters',
  'at least 32 characters',
);

// 2.2 Successfully signs and verifies with 32+ character secret
const token = signJwtHmacSha256(
  { sub: 'user_test_123', email: 'test@aeonexus.internal' },
  secureSecret,
);
assert(
  typeof token === 'string' && token.split('.').length === 3,
  'signJwtHmacSha256 produces valid 3-part token',
);

const verified = verifyJwtHmacSha256(token, secureSecret);
assert(
  verified.sub === 'user_test_123' && verified.email === 'test@aeonexus.internal',
  'verifyJwtHmacSha256 verifies signature and returns correct payload',
);

// 2.3 Verification fails with incorrect secret
expectThrow(
  () => {
    verifyJwtHmacSha256(token, 'different_secret_that_is_also_32_chars_long_for_testing!');
  },
  'verifyJwtHmacSha256 rejects incorrect secret with invalid signature error',
  'Invalid cryptographic signature',
);

// 2.4 Verification fails when payload is tampered
const parts = token.split('.');
const tamperedPayload = Buffer.from(
  JSON.stringify({ sub: 'admin', email: 'hacker@evil.com' }),
).toString('base64url');
const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
expectThrow(
  () => {
    verifyJwtHmacSha256(tamperedToken, secureSecret);
  },
  'verifyJwtHmacSha256 rejects tampered payload',
  'Invalid cryptographic signature',
);

// 2.5 Verification fails when token is expired
const expiredToken = signJwtHmacSha256(
  { sub: 'user_expired', exp: Math.floor(Date.now() / 1000) - 100 },
  secureSecret,
);
expectThrow(
  () => {
    verifyJwtHmacSha256(expiredToken, secureSecret);
  },
  'verifyJwtHmacSha256 rejects expired token',
  'Token has expired',
);

console.log('\n================================================================');
console.log(`Results: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
