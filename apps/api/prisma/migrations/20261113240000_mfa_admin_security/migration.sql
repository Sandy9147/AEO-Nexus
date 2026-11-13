-- AlterTable
ALTER TABLE "users" ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mfa_secret" TEXT,
ADD COLUMN "mfa_recovery_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "mfa_last_used_code" TEXT,
ADD COLUMN "mfa_enrolled_at" TIMESTAMP(3);
