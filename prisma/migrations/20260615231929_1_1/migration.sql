/*
  Warnings:

  - Made the column `description` on table `tutorial` required. This step will fail if there are existing NULL values in that column.
  - Made the column `materialsNeeded` on table `tutorial` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `tutorial` MODIFY `description` VARCHAR(191) NOT NULL,
    MODIFY `materialsNeeded` JSON NOT NULL;
