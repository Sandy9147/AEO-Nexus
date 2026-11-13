/**
 * Neon Database Connectivity & Pre-flight Verification Script
 * Validates pooled (DATABASE_URL) and direct (DIRECT_URL) connectivity without leaking credentials.
 */

const fs = require('fs');
const path = require('path');

let PrismaClient;
try {
  ({ PrismaClient } = require('@prisma/client'));
} catch {
  ({ PrismaClient } = require(path.resolve(__dirname, '../apps/api/node_modules/@prisma/client')));
}

function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Load root .env then apps/api/.env
loadEnvFile(path.resolve(__dirname, '../.env'));
loadEnvFile(path.resolve(__dirname, '../apps/api/.env'));

function maskConnectionString(rawUrl) {
  if (!rawUrl) return '(not provided)';
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = '********';
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(/:([^:@]+)@/, ':********@');
  }
}

async function testConnection(url, label) {
  const masked = maskConnectionString(url);
  console.log(`\nTesting ${label}...`);
  console.log(`  Target: ${masked}`);

  const isPlaceholder =
    !url ||
    url.includes('YOUR_PASSWORD') ||
    url.includes('ep-sample') ||
    url.includes('example.com');

  if (isPlaceholder) {
    console.log(`  Status: [NOT TESTED] - Connection string contains placeholder credentials.`);
    console.log(
      `  Action: To test against live Neon, replace placeholder with real Neon URL in .env`,
    );
    return { status: 'NOT TESTED', reason: 'Placeholder credentials configured' };
  }

  const client = new PrismaClient({
    datasources: {
      db: { url },
    },
    log: ['error'],
  });

  try {
    const result = await Promise.race([
      client.$queryRaw`SELECT 1 as connected`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out after 5000ms')), 5000),
      ),
    ]);

    console.log(`  Status: [PASS] - Successfully connected and executed SELECT 1`);
    console.log(`  Telemetry:`, result);
    return { status: 'PASS' };
  } catch (err) {
    const sanitizedError = (err.message || String(err)).replace(/:([^:@]+)@/, ':********@');
    console.log(`  Status: [FAIL] - Connection failed: ${sanitizedError}`);
    return { status: 'FAIL', error: sanitizedError };
  } finally {
    await client.$disconnect().catch(() => {});
  }
}

async function run() {
  console.log('================================================================');
  console.log('       AEO Nexus — Neon Database Connectivity Test');
  console.log('================================================================');

  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;

  const runtimeResult = await testConnection(
    databaseUrl,
    'Runtime Connection (DATABASE_URL - Pooled)',
  );
  const migrationResult = await testConnection(
    directUrl,
    'Migration Connection (DIRECT_URL - Direct)',
  );

  console.log('\n================================================================');
  console.log('                     Summary of Results');
  console.log('================================================================');
  console.log(`- Runtime Connectivity (DATABASE_URL):  ${runtimeResult.status}`);
  console.log(`- Migration Connectivity (DIRECT_URL): ${migrationResult.status}`);
  console.log('================================================================\n');

  if (runtimeResult.status === 'FAIL' || migrationResult.status === 'FAIL') {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
