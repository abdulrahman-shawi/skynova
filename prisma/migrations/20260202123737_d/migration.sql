/*
  Warnings:

  - You are about to drop the column `agefit` on the `Customer` table. All the data in the column will be lost.
  - Added the required column `genderfit` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "agefit",
ADD COLUMN     "genderfit" TEXT NOT NULL,
ADD COLUMN     "genderhair" TEXT;
