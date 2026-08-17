-- CreateTable
CREATE TABLE "WholesaleWarranty" (
    "id" TEXT NOT NULL,
    "type" "WarrantyType" NOT NULL,
    "productId" INTEGER NOT NULL,
    "wholesaleCustomerId" TEXT,
    "warehouseId" INTEGER,
    "wholesaleOrderId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "maintenanceLaborCost" DOUBLE PRECISION,
    "shippingCost" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WholesaleWarranty_wholesaleOrderId_idx" ON "WholesaleWarranty"("wholesaleOrderId");

-- AddForeignKey
ALTER TABLE "WholesaleWarranty" ADD CONSTRAINT "WholesaleWarranty_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleWarranty" ADD CONSTRAINT "WholesaleWarranty_wholesaleCustomerId_fkey" FOREIGN KEY ("wholesaleCustomerId") REFERENCES "WholesaleCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleWarranty" ADD CONSTRAINT "WholesaleWarranty_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleWarranty" ADD CONSTRAINT "WholesaleWarranty_wholesaleOrderId_fkey" FOREIGN KEY ("wholesaleOrderId") REFERENCES "WholesaleOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
