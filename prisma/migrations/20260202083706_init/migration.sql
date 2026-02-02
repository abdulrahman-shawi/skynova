-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "Interest" AS ENUM ('SKIN_PRODUCTS', 'LASER_DEVICES', 'SLIMMING_PROG');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "accountType" "AccountType" NOT NULL DEFAULT 'STAFF',
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "permissionId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "viewProducts" BOOLEAN NOT NULL DEFAULT false,
    "addProducts" BOOLEAN NOT NULL DEFAULT false,
    "editProducts" BOOLEAN NOT NULL DEFAULT false,
    "deleteProducts" BOOLEAN NOT NULL DEFAULT false,
    "viewReports" BOOLEAN NOT NULL DEFAULT false,
    "addReports" BOOLEAN NOT NULL DEFAULT false,
    "editReports" BOOLEAN NOT NULL DEFAULT false,
    "deleteReports" BOOLEAN NOT NULL DEFAULT false,
    "viewOrders" BOOLEAN NOT NULL DEFAULT false,
    "addOrders" BOOLEAN NOT NULL DEFAULT false,
    "editOrders" BOOLEAN NOT NULL DEFAULT false,
    "deleteOrders" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION DEFAULT 0,
    "description" TEXT,
    "quantity" TEXT,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "countryCode" TEXT,
    "country" TEXT,
    "city" TEXT,
    "source" TEXT,
    "ageGroup" TEXT,
    "socialStatus" TEXT,
    "skinType" TEXT,
    "gender" TEXT,
    "skinProblems" TEXT[],
    "skinColor" TEXT,
    "hairColor" TEXT,
    "genderlaser" TEXT,
    "laserPurpose" TEXT,
    "bodyType" TEXT,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "mainProblem" TEXT,
    "agefit" TEXT NOT NULL,
    "isDiabetic" BOOLEAN NOT NULL DEFAULT false,
    "isPregnant" BOOLEAN NOT NULL DEFAULT false,
    "hasHypertension" BOOLEAN NOT NULL DEFAULT false,
    "isBreastfeeding" BOOLEAN NOT NULL DEFAULT false,
    "hormonalTherapy" BOOLEAN NOT NULL DEFAULT false,
    "followsDiet" BOOLEAN NOT NULL DEFAULT false,
    "regularExercise" BOOLEAN NOT NULL DEFAULT false,
    "interestedInAds" BOOLEAN NOT NULL DEFAULT false,
    "isTargetClient" BOOLEAN NOT NULL DEFAULT false,
    "inquiresForElse" BOOLEAN NOT NULL DEFAULT false,
    "interests" "Interest"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CustomerToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomerToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "_CustomerToUser_B_index" ON "_CustomerToUser"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToUser" ADD CONSTRAINT "_CustomerToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToUser" ADD CONSTRAINT "_CustomerToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
