-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "addPermissions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletePermissions" BOOLEAN NOT NULL DEFAULT false;
