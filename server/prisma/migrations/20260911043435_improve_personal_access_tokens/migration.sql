/*
  Warnings:

  - A unique constraint covering the columns `[tokenPrefix]` on the table `PersonalAccessToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenPrefix` to the `PersonalAccessToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PersonalAccessToken" ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "tokenPrefix" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccessToken_tokenPrefix_key" ON "PersonalAccessToken"("tokenPrefix");
