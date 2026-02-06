/*
  Warnings:

  - You are about to drop the column `ageGroup` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `socialStatus` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Customer` table. All the data in the column will be lost.
  - The `phone` column on the `Customer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "ageGroup",
DROP COLUMN "city",
DROP COLUMN "socialStatus",
DROP COLUMN "source",
DROP COLUMN "phone",
ADD COLUMN     "phone" TEXT[];

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
