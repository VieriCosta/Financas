ALTER TABLE "Investment"
ADD COLUMN "ticker" TEXT,
ADD COLUMN "quantity" DECIMAL(18, 8),
ADD COLUMN "averagePrice" DECIMAL(18, 8),
ADD COLUMN "broker" TEXT,
ADD COLUMN "institution" TEXT,
ADD COLUMN "indexer" TEXT,
ADD COLUMN "annualRate" DECIMAL(8, 2),
ADD COLUMN "maturityDate" TIMESTAMP(3),
ADD COLUMN "liquidity" TEXT,
ADD COLUMN "custodyLocation" TEXT,
ADD COLUMN "walletAddress" TEXT,
ADD COLUMN "notes" TEXT;
