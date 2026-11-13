# AEO Nexus — Neon Database Architecture & Operations Guide

This document details the configuration, connection lifecycle, and migration workflow for the **Neon Hosted PostgreSQL** integration in AEO Nexus.

---

## 1. Overview & Architecture

AEO Nexus uses [Neon](https://neon.tech) as its primary serverless PostgreSQL database.

```
                           +------------------------+
                           |  Frontend Applications |
                           | (Public/Customer/Admin)|
                           +-----------+------------+
                                       | HTTP / REST (No direct DB)
                                       v
                           +------------------------+
                           |   apps/api (NestJS)    |
                           +-----------+------------+
                                       |
                   +-------------------+-------------------+
                   | (Runtime Queries)                     | (Migrations Only)
                   | DATABASE_URL                          | DIRECT_URL
                   | (PgBouncer Pooled, port 5432)         | (Direct Compute Endpoint)
                   v                                       v
         +-------------------+                   +-------------------+
         | Neon Pooler Node  |                   | Neon Compute Node |
         +---------+---------+                   +---------+---------+
                   |                                       |
                   +-------------------+-------------------+
                                       |
                                       v
                          +-------------------------+
                          |   Neon PostgreSQL DB    |
                          | (Branch: dev/staging/   |
                          |  production)            |
                          +-------------------------+
```

### Security Boundary

- **Zero Frontend Exposure**: Database connection strings (`DATABASE_URL`, `DIRECT_URL`) are strictly loaded server-side by `apps/api` and `apps/worker`.
- None of the frontend web applications (`apps/public-web`, `apps/customer-web`, `apps/agency-web`, `apps/admin-web`, `apps/superadmin-web`) or the mobile client (`apps/mobile`) have access to or import Prisma or database drivers. All database operations are proxied through authenticated NestJS API endpoints with server-side authorization checks.

---

## 2. Environment Variables Configuration

Two distinct connection strings are required for Neon:

```env
# 1. DATABASE_URL: Neon Pooled Connection String (Used for all application runtime traffic)
DATABASE_URL="postgresql://[user]:[password]@[endpoint-id]-pooler.[region].aws.neon.tech/[dbname]?sslmode=require&pgbouncer=true"

# 2. DIRECT_URL: Neon Direct Connection String (Used strictly for Prisma schema migrations)
DIRECT_URL="postgresql://[user]:[password]@[endpoint-id].[region].aws.neon.tech/[dbname]?sslmode=require"
```

### Prisma Schema Datasource

In `apps/api/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- When the application executes queries (via `@prisma/client`), Prisma uses `url` (the pooled connection), maintaining high connection reuse without exhausting PostgreSQL connection limits.
- When you run `prisma migrate dev` or `prisma migrate deploy`, Prisma CLI automatically switches to `directUrl` to obtain direct session state and advisory locks (`pg_advisory_lock`), which transaction-mode connection poolers cannot provide.

---

## 3. Neon Branching Strategy

Neon supports copy-on-write instant branching. AEO Nexus aligns with this model across environments:

| Environment     | Recommended Branch       | Purpose                                 | Isolation Policy                                    |
| --------------- | ------------------------ | --------------------------------------- | --------------------------------------------------- |
| **Development** | `dev` or `feat-[ticket]` | Local testing & active schema iteration | Ephemeral; can be branched from `main` or `staging` |
| **Staging**     | `staging`                | Pre-production validation & QA          | Mirrors production schema; staging test data        |
| **Production**  | `main`                   | Production live workloads               | Protected branch; automated backups; PITR           |

### Rules for Schema Changes

1. **Never use `db push` in production**: `prisma db push` bypasses migration history tracking and can result in untracked drift or data loss.
2. **Always create migrations in development**:
   ```bash
   pnpm run db:migrate --name add_feature_fields
   ```
3. **Commit the generated migration folder**: Review the generated SQL in `apps/api/prisma/migrations/` and commit it to Git.
4. **Deploy migrations in CI/CD pipeline**:
   ```bash
   pnpm run db:deploy
   ```

---

## 4. Connection Resilience & Graceful Shutdown

Neon compute endpoints automatically suspend when inactive and resume upon query arrival (cold-start typically takes 1–3 seconds).

To ensure high availability and prevent cold-start failures:

1. **Retry Mechanism**: `PrismaService` implements `connectWithRetry()` with exponential backoff on startup.
2. **Health Check Probe Tolerance**: The `/health` endpoint (`HealthService`) bounds the `SELECT 1` ping with a 5-second race timeout, preventing slow wakeups from blocking health checks.
3. **Graceful Disconnect**: On process termination (`SIGINT`, `SIGTERM`), `PrismaService` cleanly calls `$disconnect()` to ensure open connections are flushed and released.

---

## 5. Operations & Migration Command Reference

| Action                           | Command                | Description                                                  |
| -------------------------------- | ---------------------- | ------------------------------------------------------------ |
| **Validate Schema**              | `pnpm run db:validate` | Validates Prisma schema syntax and datasource config         |
| **Generate Client**              | `pnpm run db:generate` | Compiles `@prisma/client` with latest schema definitions     |
| **Create/Apply Dev Migration**   | `pnpm run db:migrate`  | Runs `prisma migrate dev` against development database       |
| **Deploy Production Migrations** | `pnpm run db:deploy`   | Runs `prisma migrate deploy` (for CI / Staging / Production) |
| **Inspect Migration Status**     | `pnpm run db:status`   | Checks pending or applied migrations                         |
