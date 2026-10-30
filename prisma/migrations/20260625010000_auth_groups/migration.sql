-- CreateTable
CREATE TABLE `RoboticsGroup` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RoboticsGroup_name_key`(`name`),
    PRIMARY KEY (`id`)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `roboticsGroupId` INT NULL,
    ADD INDEX `User_roboticsGroupId_idx`(`roboticsGroupId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roboticsGroupId_fkey` FOREIGN KEY (`roboticsGroupId`) REFERENCES `RoboticsGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;