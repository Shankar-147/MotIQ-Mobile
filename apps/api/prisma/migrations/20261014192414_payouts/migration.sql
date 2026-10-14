-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'paid', 'cancelled');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "gatewayReference" TEXT;

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_paymentId_key" ON "Payout"("paymentId");

-- CreateIndex
CREATE INDEX "Payout_providerId_idx" ON "Payout"("providerId");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
