-- CreateTable
CREATE TABLE "IMPlatform" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "appId" TEXT,
    "appSecret" TEXT,
    "encryptKey" TEXT,
    "verifyToken" TEXT,
    "botToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IMPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMUser" (
    "id" SERIAL NOT NULL,
    "platformId" INTEGER NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "platformName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IMUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IMMessage" (
    "id" SERIAL NOT NULL,
    "platformId" INTEGER NOT NULL,
    "imUserId" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "intent" TEXT,
    "action" TEXT,
    "actionResult" JSONB,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IMMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IMPlatform_name_key" ON "IMPlatform"("name");

-- CreateIndex
CREATE INDEX "IMUser_platformId_idx" ON "IMUser"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "IMUser_platformId_platformUserId_key" ON "IMUser"("platformId", "platformUserId");

-- CreateIndex
CREATE INDEX "IMMessage_createdAt_idx" ON "IMMessage"("createdAt");

-- CreateIndex
CREATE INDEX "IMMessage_platformId_idx" ON "IMMessage"("platformId");

-- AddForeignKey
ALTER TABLE "IMUser" ADD CONSTRAINT "IMUser_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "IMPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMMessage" ADD CONSTRAINT "IMMessage_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "IMPlatform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IMMessage" ADD CONSTRAINT "IMMessage_imUserId_fkey" FOREIGN KEY ("imUserId") REFERENCES "IMUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
