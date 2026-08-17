-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('FOLDER', 'FILE');

-- CreateEnum
CREATE TYPE "FileVersionStatus" AS ENUM ('PENDING', 'READY');

-- CreateEnum
CREATE TYPE "ShareTargetType" AS ENUM ('DATA_ROOM', 'NODE');

-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PUBLIC_LINK', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('VIEWER');

-- CreateEnum
CREATE TYPE "ShareAccessAction" AS ENUM ('LIST', 'VIEW', 'DOWNLOAD');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRoom" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DataRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" UUID NOT NULL,
    "dataRoomId" UUID NOT NULL,
    "parentId" UUID,
    "type" "NodeType" NOT NULL,
    "name" TEXT NOT NULL,
    "ancestorIds" UUID[],
    "depth" INTEGER NOT NULL DEFAULT 0,
    "currentVersionId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileVersion" (
    "id" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT NOT NULL,
    "status" "FileVersionStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" UUID NOT NULL,
    "dataRoomId" UUID NOT NULL,
    "targetType" "ShareTargetType" NOT NULL,
    "nodeId" UUID,
    "mode" "ShareMode" NOT NULL,
    "role" "ShareRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareRecipient" (
    "id" UUID NOT NULL,
    "shareId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "userId" UUID,
    "role" "ShareRole",
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ShareRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareAccessEvent" (
    "id" UUID NOT NULL,
    "shareId" UUID NOT NULL,
    "nodeId" UUID,
    "userId" UUID,
    "email" TEXT,
    "action" "ShareAccessAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "DataRoom_ownerId_deletedAt_createdAt_idx" ON "DataRoom"("ownerId", "deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Node_currentVersionId_key" ON "Node"("currentVersionId");

-- CreateIndex
CREATE INDEX "Node_dataRoomId_parentId_deletedAt_type_name_idx" ON "Node"("dataRoomId", "parentId", "deletedAt", "type", "name");

-- CreateIndex
CREATE INDEX "Node_ancestorIds_idx" ON "Node" USING GIN ("ancestorIds");

-- CreateIndex
CREATE INDEX "Node_dataRoomId_deletedAt_idx" ON "Node"("dataRoomId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileVersion_storageKey_key" ON "FileVersion"("storageKey");

-- CreateIndex
CREATE INDEX "FileVersion_status_createdAt_idx" ON "FileVersion"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileVersion_nodeId_version_key" ON "FileVersion"("nodeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");

-- CreateIndex
CREATE INDEX "Share_dataRoomId_revokedAt_idx" ON "Share"("dataRoomId", "revokedAt");

-- CreateIndex
CREATE INDEX "Share_nodeId_revokedAt_idx" ON "Share"("nodeId", "revokedAt");

-- CreateIndex
CREATE INDEX "ShareRecipient_email_revokedAt_idx" ON "ShareRecipient"("email", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareRecipient_shareId_email_key" ON "ShareRecipient"("shareId", "email");

-- CreateIndex
CREATE INDEX "ShareAccessEvent_shareId_createdAt_idx" ON "ShareAccessEvent"("shareId", "createdAt");

-- AddForeignKey
ALTER TABLE "DataRoom" ADD CONSTRAINT "DataRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "FileVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileVersion" ADD CONSTRAINT "FileVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileVersion" ADD CONSTRAINT "FileVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareRecipient" ADD CONSTRAINT "ShareRecipient_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareRecipient" ADD CONSTRAINT "ShareRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareAccessEvent" ADD CONSTRAINT "ShareAccessEvent_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareAccessEvent" ADD CONSTRAINT "ShareAccessEvent_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareAccessEvent" ADD CONSTRAINT "ShareAccessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-written below: Prisma's schema language cannot express partial or
-- expression indexes. Generate future migrations with `--create-only` and check
-- the diff does not drop them.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Names are unique per folder among live rows only, so deleting and re-uploading
-- the same document works. On lower(name) to match the case-insensitive rule the
-- application applies when suggesting a free name.
CREATE UNIQUE INDEX "Node_parentId_name_live_key"
  ON "Node" ("parentId", lower("name"))
  WHERE "deletedAt" IS NULL AND "parentId" IS NOT NULL;

-- Root nodes have parentId = NULL, and Postgres treats NULLs as distinct, so the
-- index above cannot catch two identically named folders at the top level.
CREATE UNIQUE INDEX "Node_dataRoomId_rootName_live_key"
  ON "Node" ("dataRoomId", lower("name"))
  WHERE "deletedAt" IS NULL AND "parentId" IS NULL;

-- Turns lower("name") LIKE '%query%' into an index scan.
CREATE INDEX "Node_name_trgm_idx"
  ON "Node" USING GIN (lower("name") gin_trgm_ops);
