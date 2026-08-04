-- AlterTable
-- Adds a password column to shipping companies with a default value.
-- This is a non-destructive change: existing rows keep all their data
-- and automatically receive the default password '1234567'.
ALTER TABLE "shipping" ADD COLUMN "password" TEXT NOT NULL DEFAULT '1234567';
