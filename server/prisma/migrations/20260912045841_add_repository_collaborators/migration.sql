-- CreateEnum
CREATE TYPE "RepositoryPermission" AS ENUM ('READ', 'WRITE');

-- CreateTable
CREATE TABLE "RepositoryCollaborator" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "RepositoryPermission" NOT NULL DEFAULT 'READ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepositoryCollaborator_repositoryId_idx" ON "RepositoryCollaborator"("repositoryId");

-- CreateIndex
CREATE INDEX "RepositoryCollaborator_userId_idx" ON "RepositoryCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryCollaborator_repositoryId_userId_key" ON "RepositoryCollaborator"("repositoryId", "userId");

-- AddForeignKey
ALTER TABLE "RepositoryCollaborator" ADD CONSTRAINT "RepositoryCollaborator_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepositoryCollaborator" ADD CONSTRAINT "RepositoryCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
