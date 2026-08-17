-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "versionCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Node_dataRoomId_parentId_deletedAt_type_updatedAt_idx" ON "Node"("dataRoomId", "parentId", "deletedAt", "type", "updatedAt");

-- CreateIndex
CREATE INDEX "Node_dataRoomId_parentId_deletedAt_type_sizeBytes_idx" ON "Node"("dataRoomId", "parentId", "deletedAt", "type", "sizeBytes");
