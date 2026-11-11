-- CreateTable
CREATE TABLE "EmployeeMonthlyNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeMonthlyNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeMonthlyNote_userId_monthKey_key" ON "EmployeeMonthlyNote"("userId", "monthKey");

-- AddForeignKey
ALTER TABLE "EmployeeMonthlyNote" ADD CONSTRAINT "EmployeeMonthlyNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
