-- CreateTable
CREATE TABLE "ContributionCalendar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "contributionCount" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContributionCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContributionCalendar_userId_date_key" ON "ContributionCalendar"("userId", "date");

-- CreateIndex
CREATE INDEX "ContributionCalendar_userId_date_idx" ON "ContributionCalendar"("userId", "date");

-- AddForeignKey
ALTER TABLE "ContributionCalendar" ADD CONSTRAINT "ContributionCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
