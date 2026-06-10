-- Add new roles to the enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STORE_ADMIN';

-- Add storeId to User for STORE_ADMIN assignment
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storeId" TEXT;

-- Add index for storeId
CREATE INDEX IF NOT EXISTS "User_storeId_idx" ON "User"("storeId");

-- Add foreign key constraint
ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL;

-- Promote existing ADMIN users to SUPER_ADMIN (done separately via prisma migrate resolve)
-- Note: this UPDATE is executed in a separate step after the migration commits
-- because PostgreSQL does not allow referencing a newly-added enum value
-- in the same transaction that created it (error 55P04).
