/*
  Warnings:

  - You are about to drop the column `shippingCompany` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `trackingCode` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "shippingCompany",
DROP COLUMN "trackingCode",
ADD COLUMN     "amount" TEXT,
ADD COLUMN     "amountBank" TEXT;
