-- AlterTable
ALTER TABLE "User" ADD COLUMN     "winningBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserInGame" ADD COLUMN     "balanceChange" INTEGER NOT NULL DEFAULT 0;
