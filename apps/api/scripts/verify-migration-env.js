/**
 * Pre-migration environment validator for Neon Hosted PostgreSQL.
 * Ensures DIRECT_URL is always provided for Prisma migrations,
 * and prevents accidental execution with placeholder or dev credentials in staging/production.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Helper to parse simple .env files if not already populated in process.env
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
loadEnvFile(path.resolve(__dirname, '../../../.env'));
loadEnvFile(path.resolve(__dirname, '../.env'));

const nodeEnv = process.env.NODE_ENV || 'development';
const directUrl = process.env.DIRECT_URL;
const databaseUrl = process.env.DATABASE_URL;

// 1. Mandatory DIRECT_URL check
if (!directUrl || directUrl.trim() === '') {
  console.error('\n❌ [Prisma Migration Pre-flight Error]');
  console.error('DIRECT_URL is mandatory for Prisma migrations against Neon PostgreSQL.');
  console.error(
    'Please set DIRECT_URL to your Neon direct (non-pooled) connection string in .env.\n',
  );
  process.exit(1);
}

// 2. Mandatory DATABASE_URL check
if (!databaseUrl || databaseUrl.trim() === '') {
  console.error('\n❌ [Prisma Migration Pre-flight Error]');
  console.error('DATABASE_URL is missing. Please set DATABASE_URL in .env.\n');
  process.exit(1);
}

// 3. Prevent silent fallback / placeholder execution in staging or production
if (nodeEnv === 'production' || nodeEnv === 'staging') {
  const isDirectPlaceholder =
    directUrl.includes('YOUR_PASSWORD') ||
    directUrl.includes('ep-sample') ||
    directUrl.includes('localhost');

  const isDatabasePlaceholder =
    databaseUrl.includes('YOUR_PASSWORD') ||
    databaseUrl.includes('ep-sample') ||
    databaseUrl.includes('localhost');

  if (isDirectPlaceholder || isDatabasePlaceholder) {
    console.error(`\n❌ [Prisma Migration Safety Gate - Environment: ${nodeEnv.toUpperCase()}]`);
    console.error(
      'Execution blocked: Production and staging environments cannot use placeholder or development connection credentials.',
    );
    console.error(
      'Ensure real, authenticated Neon connection strings are provided in environment variables.\n',
    );
    process.exit(1);
  }
}

// Execute the requested prisma command passed via CLI arguments
const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.log('✓ Migration environment verified successfully.');
  process.exit(0);
}

const prismaCmd = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const localPrisma = path.resolve(__dirname, '../node_modules/.bin', prismaCmd);
const executable = fs.existsSync(localPrisma)
  ? localPrisma
  : process.platform === 'win32'
    ? 'npx.cmd'
    : 'npx';
const args = fs.existsSync(localPrisma) ? prismaArgs : ['prisma', ...prismaArgs];

const quotedExecutable = `"${executable}"`;
const result = spawnSync(quotedExecutable, args, {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
});

process.exit(result.status ?? 0);
