-- AlterTable
ALTER TABLE `RoboticsGroup`
    ADD COLUMN `students` TEXT NULL,
    ADD COLUMN `grade` VARCHAR(191) NULL,
    ADD COLUMN `schoolId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `RoboticsGroup_schoolId_fkey` ON `RoboticsGroup`(`schoolId`);

-- AddForeignKey
ALTER TABLE `RoboticsGroup` ADD CONSTRAINT `RoboticsGroup_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `Project` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `Tutorial` MODIFY `description` TEXT NOT NULL;
