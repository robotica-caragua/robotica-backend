-- AlterTable
ALTER TABLE `User` ADD COLUMN `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING';

-- Existing accounts were already active before the approval flow existed.
UPDATE `User` SET `approvalStatus` = 'APPROVED';

-- AlterTable
ALTER TABLE `Project` ADD COLUMN `media` JSON NULL,
    ADD COLUMN `students` JSON NULL,
    ADD COLUMN `teacherId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
