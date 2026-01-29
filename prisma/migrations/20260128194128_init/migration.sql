-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'STAFF',
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "permissionId" TEXT,
    CONSTRAINT "User_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "deleteOrders" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
