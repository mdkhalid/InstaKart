-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "mergedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT,
    "eventType" TEXT NOT NULL,
    "productId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Make userId nullable on SearchActivity
ALTER TABLE "SearchActivity" DROP CONSTRAINT "SearchActivity_userId_fkey";
ALTER TABLE "SearchActivity" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "SearchActivity" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "SearchActivity" ADD CONSTRAINT "SearchActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Make userId nullable on ProductView
ALTER TABLE "ProductView" DROP CONSTRAINT "ProductView_userId_fkey";
ALTER TABLE "ProductView" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ProductView" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_visitorId_key" ON "Visitor"("visitorId");
CREATE INDEX "Visitor_visitorId_idx" ON "Visitor"("visitorId");
CREATE INDEX "Visitor_userId_idx" ON "Visitor"("userId");

-- CreateIndex
CREATE INDEX "TrackingEvent_userId_createdAt_idx" ON "TrackingEvent"("userId", "createdAt");
CREATE INDEX "TrackingEvent_visitorId_createdAt_idx" ON "TrackingEvent"("visitorId", "createdAt");
CREATE INDEX "TrackingEvent_eventType_createdAt_idx" ON "TrackingEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "SearchActivity_visitorId_createdAt_idx" ON "SearchActivity"("visitorId", "createdAt");
CREATE INDEX "ProductView_visitorId_createdAt_idx" ON "ProductView"("visitorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchActivity" ADD CONSTRAINT "SearchActivity_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
