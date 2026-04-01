/*
  Warnings:

  - You are about to drop the column `endTime` on the `Availability` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Availability` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Availability` table. All the data in the column will be lost.
  - Added the required column `endHour` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startHour` to the `Availability` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Availability_userId_idx";

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "endTime",
DROP COLUMN "startTime",
DROP COLUMN "updatedAt",
ADD COLUMN     "endHour" INTEGER NOT NULL,
ADD COLUMN     "startHour" INTEGER NOT NULL;
