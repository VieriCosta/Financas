CREATE TABLE "DashboardPreference" (
  "id" TEXT NOT NULL, "hiddenWidgets" TEXT[] DEFAULT ARRAY[]::TEXT[], "widgetOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "chartMonths" INTEGER NOT NULL DEFAULT 6, "userId" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashboardPreference_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Tag" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "color" TEXT NOT NULL DEFAULT '#2563eb', "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TransactionTag" (
  "transactionId" TEXT NOT NULL, "tagId" TEXT NOT NULL, CONSTRAINT "TransactionTag_pkey" PRIMARY KEY ("transactionId","tagId")
);
CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL, "filename" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL, "content" BYTEA NOT NULL,
  "userId" TEXT NOT NULL, "transactionId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MonthlyClosing" (
  "id" TEXT NOT NULL, "month" INTEGER NOT NULL, "year" INTEGER NOT NULL, "income" DECIMAL(12,2) NOT NULL,
  "expense" DECIMAL(12,2) NOT NULL, "budgetTotal" DECIMAL(12,2) NOT NULL, "snapshot" JSONB NOT NULL,
  "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MonthlyClosing_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL, "userAgent" TEXT, "ipAddress" TEXT, "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL, "action" TEXT NOT NULL, "resource" TEXT NOT NULL, "resourceId" TEXT, "details" JSONB,
  "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DashboardPreference_userId_key" ON "DashboardPreference"("userId");
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId","name");
CREATE INDEX "Attachment_transactionId_idx" ON "Attachment"("transactionId");
CREATE UNIQUE INDEX "MonthlyClosing_userId_month_year_key" ON "MonthlyClosing"("userId","month","year");
CREATE INDEX "MonthlyClosing_userId_year_month_idx" ON "MonthlyClosing"("userId","year","month");
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId","revokedAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId","createdAt");
ALTER TABLE "DashboardPreference" ADD CONSTRAINT "DashboardPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionTag" ADD CONSTRAINT "TransactionTag_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TransactionTag" ADD CONSTRAINT "TransactionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlyClosing" ADD CONSTRAINT "MonthlyClosing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
