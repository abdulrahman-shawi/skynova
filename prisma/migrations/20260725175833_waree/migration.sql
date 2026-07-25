-- CreateTable
CREATE TABLE "_UserWarehouseAccess" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserWarehouseAccess_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserWarehouseAccess_B_index" ON "_UserWarehouseAccess"("B");

-- AddForeignKey
ALTER TABLE "_UserWarehouseAccess" ADD CONSTRAINT "_UserWarehouseAccess_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserWarehouseAccess" ADD CONSTRAINT "_UserWarehouseAccess_B_fkey" FOREIGN KEY ("B") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
