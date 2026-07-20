-- CreateTable
CREATE TABLE "ProductWholesalePriceTier" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductWholesalePriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleOrder" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "usdToTryRateAtOrder" DOUBLE PRECISION,
    "shippingPrice" DOUBLE PRECISION,
    "moneyTransferCommission" DOUBLE PRECISION DEFAULT 0,
    "otherCommissions" DOUBLE PRECISION DEFAULT 0,
    "carrierCollectionReceivedAt" TIMESTAMP(3),
    "carrierCollectionReceivedAmount" DOUBLE PRECISION,
    "carrierCollectionNotes" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "pay" TEXT,
    "receiverName" TEXT,
    "receiverPhone" TEXT[],
    "country" TEXT,
    "city" TEXT,
    "invoiceImage" TEXT,
    "municipality" TEXT,
    "fullAddress" TEXT,
    "deliveryNotes" TEXT,
    "googleMapsLink" TEXT,
    "amount" TEXT,
    "amountBank" TEXT,
    "deliveryMethod" TEXT,
    "additionalNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "wholesaleCustomerId" TEXT NOT NULL,
    "userId" TEXT,
    "warehouseId" INTEGER,
    "shippingId" INTEGER,
    "manualCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleOrderItem" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "wholesalePriceTierId" INTEGER,

    CONSTRAINT "WholesaleOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductWholesalePriceTier_productId_idx" ON "ProductWholesalePriceTier"("productId");

-- CreateIndex
CREATE INDEX "ProductWholesalePriceTier_productId_minQuantity_idx" ON "ProductWholesalePriceTier"("productId", "minQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "ProductWholesalePriceTier_productId_minQuantity_key" ON "ProductWholesalePriceTier"("productId", "minQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "WholesaleOrder_orderNumber_key" ON "WholesaleOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "WholesaleOrder_createdAt_idx" ON "WholesaleOrder"("createdAt");

-- CreateIndex
CREATE INDEX "WholesaleOrder_wholesaleCustomerId_createdAt_idx" ON "WholesaleOrder"("wholesaleCustomerId", "createdAt");

-- CreateIndex
CREATE INDEX "WholesaleOrder_status_createdAt_idx" ON "WholesaleOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WholesaleOrder_userId_createdAt_idx" ON "WholesaleOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WholesaleOrder_warehouseId_createdAt_idx" ON "WholesaleOrder"("warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "WholesaleOrderItem_orderId_idx" ON "WholesaleOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "WholesaleOrderItem_productId_idx" ON "WholesaleOrderItem"("productId");

-- CreateIndex
CREATE INDEX "WholesaleOrderItem_wholesalePriceTierId_idx" ON "WholesaleOrderItem"("wholesalePriceTierId");

-- AddForeignKey
ALTER TABLE "ProductWholesalePriceTier" ADD CONSTRAINT "ProductWholesalePriceTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleOrder" ADD CONSTRAINT "WholesaleOrder_wholesaleCustomerId_fkey" FOREIGN KEY ("wholesaleCustomerId") REFERENCES "WholesaleCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleOrder" ADD CONSTRAINT "WholesaleOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleOrder" ADD CONSTRAINT "WholesaleOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleOrder" ADD CONSTRAINT "WholesaleOrder_shippingId_fkey" FOREIGN KEY ("shippingId") REFERENCES "shipping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleOrderItem" ADD CONSTRAINT "WholesaleOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "WholesaleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleOrderItem" ADD CONSTRAINT "WholesaleOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WholesaleOrderItem" ADD CONSTRAINT "WholesaleOrderItem_wholesalePriceTierId_fkey" FOREIGN KEY ("wholesalePriceTierId") REFERENCES "ProductWholesalePriceTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
