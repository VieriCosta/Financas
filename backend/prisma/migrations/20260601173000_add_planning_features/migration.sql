CREATE TYPE "RecurringResourceType" AS ENUM ('TRANSACTION', 'BILL');
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE "AiHistoryKind" AS ENUM ('ADVICE', 'COMMAND', 'REPORT');
CREATE TYPE "AiHistoryStatus" AS ENUM ('ANSWERED', 'PENDING', 'CONFIRMED');

ALTER TABLE "Transaction"
ADD COLUMN "installmentGroupId" TEXT,
ADD COLUMN "installmentNumber" INTEGER,
ADD COLUMN "installmentTotal" INTEGER;

ALTER TABLE "Bill"
ADD COLUMN "notifiedAt" TIMESTAMP(3);

CREATE TABLE "Budget" (
  "id" TEXT NOT NULL,
  "limitAmount" DECIMAL(12,2) NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringRule" (
  "id" TEXT NOT NULL,
  "resource" "RecurringResourceType" NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "transactionType" "TransactionType",
  "frequency" "RecurrenceFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "dayOfMonth" INTEGER,
  "dayOfWeek" INTEGER,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiHistory" (
  "id" TEXT NOT NULL,
  "kind" "AiHistoryKind" NOT NULL,
  "status" "AiHistoryStatus" NOT NULL,
  "request" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "actionJson" JSONB,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transaction_installmentGroupId_idx" ON "Transaction"("installmentGroupId");
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_year_key" ON "Budget"("userId", "categoryId", "month", "year");
CREATE INDEX "Budget_userId_year_month_idx" ON "Budget"("userId", "year", "month");
CREATE INDEX "RecurringRule_userId_active_nextRunAt_idx" ON "RecurringRule"("userId", "active", "nextRunAt");
CREATE INDEX "AiHistory_userId_createdAt_idx" ON "AiHistory"("userId", "createdAt");

ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiHistory" ADD CONSTRAINT "AiHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
