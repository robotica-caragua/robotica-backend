-- AlterTable
ALTER TABLE `School` ADD COLUMN `description` TEXT NULL;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `authorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_UserSchools` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_UserSchools_AB_unique`(`A`, `B`),
    INDEX `_UserSchools_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_UserSchools` ADD CONSTRAINT `_UserSchools_A_fkey` FOREIGN KEY (`A`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserSchools` ADD CONSTRAINT `_UserSchools_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: preserva o vínculo único existente (User.schoolId) como primeiro vínculo N:N.
INSERT IGNORE INTO `_UserSchools` (`A`, `B`)
SELECT `schoolId`, `id` FROM `User` WHERE `schoolId` IS NOT NULL;
