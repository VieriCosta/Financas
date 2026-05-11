-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceDay" INTEGER;
