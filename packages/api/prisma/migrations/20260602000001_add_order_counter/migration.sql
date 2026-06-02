-- CreateTable
CREATE TABLE "OrderCounter" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrderCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderCounter_year_key" ON "OrderCounter"("year");

-- Seed the counter with current year's value based on existing orders
INSERT INTO "OrderCounter" ("id", "year", "lastValue")
SELECT 'seed-' || EXTRACT(YEAR FROM NOW())::TEXT, EXTRACT(YEAR FROM NOW())::INTEGER, COUNT(*)::INTEGER
FROM "Order"
WHERE EXTRACT(YEAR FROM "createdAt") = EXTRACT(YEAR FROM NOW())
ON CONFLICT ("year") DO NOTHING;
