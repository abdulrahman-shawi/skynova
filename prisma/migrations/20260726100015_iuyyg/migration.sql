/*
  Warnings:

  - You are about to drop the `_UserWarehouseAccess` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UserWarehouseAccess" DROP CONSTRAINT "_UserWarehouseAccess_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserWarehouseAccess" DROP CONSTRAINT "_UserWarehouseAccess_B_fkey";

-- DropTable
DROP TABLE "_UserWarehouseAccess";

-- CreateTable
CREATE TABLE "_PermissionWarehouseAccess" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PermissionWarehouseAccess_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_PermissionWarehouseAccess_B_index" ON "_PermissionWarehouseAccess"("B");

-- AddForeignKey
ALTER TABLE "_PermissionWarehouseAccess" ADD CONSTRAINT "_PermissionWarehouseAccess_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PermissionWarehouseAccess" ADD CONSTRAINT "_PermissionWarehouseAccess_B_fkey" FOREIGN KEY ("B") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
