-- CreateTable
CREATE TABLE "user_onboarding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyInfoCompleted" BOOLEAN NOT NULL DEFAULT false,
    "logoUploaded" BOOLEAN NOT NULL DEFAULT false,
    "financialInfoCompleted" BOOLEAN NOT NULL DEFAULT false,
    "firstClientCreated" BOOLEAN NOT NULL DEFAULT false,
    "firstProductCreated" BOOLEAN NOT NULL DEFAULT false,
    "firstInvoiceCreated" BOOLEAN NOT NULL DEFAULT false,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "currentStep" TEXT NOT NULL DEFAULT 'company_info',
    "skippedSteps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_userId_key" ON "user_onboarding"("userId");

-- AddForeignKey
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
