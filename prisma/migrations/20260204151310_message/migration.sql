/*
  Warnings:

  - You are about to drop the column `bodyType` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `followsDiet` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `genderfit` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `genderhair` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `genderlaser` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `hairColor` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `hasHypertension` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `hormonalTherapy` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `inquiresForElse` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `interestedInAds` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `interests` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `isBreastfeeding` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `isDiabetic` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `isPregnant` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `isTargetClient` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `laserPurpose` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `mainProblem` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `regularExercise` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `skinColor` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `skinProblems` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `skinType` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Customer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "bodyType",
DROP COLUMN "followsDiet",
DROP COLUMN "gender",
DROP COLUMN "genderfit",
DROP COLUMN "genderhair",
DROP COLUMN "genderlaser",
DROP COLUMN "hairColor",
DROP COLUMN "hasHypertension",
DROP COLUMN "height",
DROP COLUMN "hormonalTherapy",
DROP COLUMN "inquiresForElse",
DROP COLUMN "interestedInAds",
DROP COLUMN "interests",
DROP COLUMN "isBreastfeeding",
DROP COLUMN "isDiabetic",
DROP COLUMN "isPregnant",
DROP COLUMN "isTargetClient",
DROP COLUMN "laserPurpose",
DROP COLUMN "mainProblem",
DROP COLUMN "regularExercise",
DROP COLUMN "skinColor",
DROP COLUMN "skinProblems",
DROP COLUMN "skinType",
DROP COLUMN "weight";

-- DropEnum
DROP TYPE "Interest";

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "message" TEXT,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
