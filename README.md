# AEO Nexus — AI-Powered Business Operating System

A global AI-powered business operating system designed for enterprise autonomy, multi-tenant workspace isolation, agency management, and high-performance workflow execution.

---

## 🏗️ Architecture & Monorepo Overview

This project is structured as a production-oriented **pnpm workspace** monorepo managed with **Turborepo**.

```
AEO Nexus/
├── apps/
│   ├── public-web/         # Next.js 14 - Public marketing website (Port 3000)
│   ├── customer-web/       # Next.js 14 - Customer dashboard (Port 3001)
│   ├── agency-web/         # Next.js 14 - Agency multi-client portal (Port 3002)
│   ├── admin-web/          # Next.js 14 - Platform administration portal (Port 3003)
│   ├── superadmin-web/     # Next.js 14 - Superadmin infrastructure control (Port 3004)
│   ├── api/                # NestJS 10 - Core REST API backend (Port 4000)
│   ├── worker/             # BullMQ - Background job processing worker
│   └── mobile/             # Flutter - Customer cross-platform mobile application
├── packages/
│   ├── ui/                 # Reusable components, design tokens, Tailwind preset
│   ├── api-client/         # Typed HTTP client for AEO Nexus API
│   ├── contracts/          # Zod schemas, API DTOs, response envelopes
│   ├── auth/               # JWT interfaces, session types, auth guards
│   ├── permissions/        # Platform roles, workspace roles, RBAC matrix
│   ├── config/             # Environment validation, app ports, configuration
│   ├── ai/                 # LLM provider abstractions, completion interfaces
│   └── workflow-engine/    # Workflow definitions, step models, queue specs
├── .github/workflows/      # Continuous Integration (Lint, Typecheck, Build)
├── docker-compose.yml      # Local development PostgreSQL 16 & Redis 7
├── pnpm-workspace.yaml     # Workspace configuration
├── turbo.json              # Turborepo task pipeline
└── tsconfig.base.json      # Shared TypeScript configuration
```

---

## 🎨 Brand & Design System

AEO Nexus uses a premium, friendly light theme built on Inter typography and accessible contrast:

| Token             | Hex / Value | Description                           |
| ----------------- | ----------- | ------------------------------------- |
| **Primary**       | `#3563F6`   | Primary action and brand accent       |
| **Violet Accent** | `#6554E8`   | Secondary brand accent / Agency theme |
| **Background**    | `#F7F9FC`   | Soft app canvas background            |
| **Surface**       | `#FFFFFF`   | Card and modal surface background     |
| **Soft Blue**     | `#EAF0FF`   | Primary badge & highlight backgrounds |
| **Soft Violet**   | `#EEF0FF`   | Violet badge & highlight backgrounds  |
| **Success**       | `#16A36A`   | Health and positive indicators        |
| **Warning**       | `#E59A27`   | Alert and attention indicators        |
| **Typography**    | `Inter`     | Clean, accessible sans-serif typeface |

Design tokens and Tailwind configurations are centralized in `@aeo-nexus/ui`.

---

## 🛡️ Security & Architectural Rules

1. **Separation of Platform Administration & Customer Authorization**: Platform administrators operate on a dedicated governance plane (`apps/admin-web`, `PlatformRole`) completely isolated from tenant workspace memberships.
2. **Server-Side Workspace Verification**: The API never trusts client-supplied workspace IDs. The `WorkspaceMembershipGuard` verifies active database membership before granting access to tenant resources.
3. **No Secret Exposure**: All credentials and API keys reside strictly on the server (`apps/api` and `apps/worker`). Frontend web apps only access public environment variables prefixed with `NEXT_PUBLIC_`.
4. **Typed API Contracts**: Endpoints and clients share contracts from `@aeo-nexus/contracts` and `@aeo-nexus/api-client`.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0
- **Docker & Docker Compose**: For local PostgreSQL and Redis
- **Flutter SDK**: >= 3.16.0 (optional, for mobile app development)

### 1. Clone & Setup Environment

```bash
# Clone the repository
git clone <repo-url>
cd "AEO Nexus"

# Copy environment variable template
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

### 2. Start Infrastructure Services (PostgreSQL & Redis)

```bash
# Spin up PostgreSQL (port 5432) and Redis (port 6379)
pnpm run docker:up

# Check container health status
docker compose ps
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Database Setup & Prisma Client Generation

```bash
# Generate Prisma Client
pnpm --filter @aeo-nexus/api run db:generate

# Push database schema to local PostgreSQL
pnpm --filter @aeo-nexus/api run db:push
```

### 5. Start Development Servers

```bash
# Run all web portals, API and worker concurrently
pnpm run dev

# Or run specific applications:
pnpm --filter @aeo-nexus/api run start:dev     # API (Port 4000)
pnpm --filter @aeo-nexus/worker run dev        # BullMQ Worker
pnpm --filter @aeo-nexus/public-web run dev    # Public Web (Port 3000)
pnpm --filter @aeo-nexus/customer-web run dev  # Customer Web (Port 3001)
pnpm --filter @aeo-nexus/agency-web run dev    # Agency Web (Port 3002)
pnpm --filter @aeo-nexus/admin-web run dev     # Admin Web (Port 3003)
pnpm --filter @aeo-nexus/superadmin-web run dev# Superadmin Web (Port 3004)
```

---

## 🩺 Health Check Endpoints

The API backend (`apps/api`) provides structured health endpoints:

- `GET http://localhost:4000/health`: Full health check returning PostgreSQL and Redis connection status.
- `GET http://localhost:4000/health/live`: Kubernetes / Docker liveness probe.
- `GET http://localhost:4000/health/ready`: Kubernetes readiness probe.

Sample health check payload:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "aeo-nexus-api",
    "version": "0.1.0",
    "uptime": 124,
    "timestamp": "2026-11-13T02:30:00.000Z",
    "dependencies": {
      "database": "up",
      "redis": "up"
    }
  },
  "timestamp": "2026-11-13T02:30:00.000Z"
}
```

---

## 🧪 CI & Quality Validation

Run code quality validations across all workspaces:

```bash
# Check formatting
pnpm run format:check

# Run ESLint across all apps and packages
pnpm run lint

# Run TypeScript compiler checks across all workspaces
pnpm run typecheck

# Build all packages and applications
pnpm run build
```
