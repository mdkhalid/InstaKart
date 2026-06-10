-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('WRONG_ITEM', 'DAMAGED', 'MISSING_ITEM', 'POOR_QUALITY', 'EXPIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'AUTO_APPROVED', 'APPROVED', 'REJECTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('WALLET', 'ORIGINAL');

-- CreateTable
CREATE TABLE "OrderIssue" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "type" "IssueType" NOT NULL,
    "description" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orderItemId" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "refundAmount" DECIMAL(10,2),
    "refundMethod" "RefundMethod",
    "adminNotes" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderIssue_orderId_idx" ON "OrderIssue"("orderId");

-- CreateIndex
CREATE INDEX "OrderIssue_status_createdAt_idx" ON "OrderIssue"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderIssue_reportedById_createdAt_idx" ON "OrderIssue"("reportedById", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderIssue" ADD CONSTRAINT "OrderIssue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIssue" ADD CONSTRAINT "OrderIssue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIssue" ADD CONSTRAINT "OrderIssue_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
