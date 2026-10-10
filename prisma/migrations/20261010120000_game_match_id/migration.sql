-- AlterTable
ALTER TABLE "Game" ADD COLUMN "matchId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Game_matchId_key" ON "Game"("matchId");
