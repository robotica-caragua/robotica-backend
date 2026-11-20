-- AlterTable
ALTER TABLE `Project`
    ADD COLUMN `imageUrl` VARCHAR(2048) NULL,
    ADD COLUMN `images` JSON NULL;

-- AlterTable
ALTER TABLE `Tutorial`
    ADD COLUMN `imageUrl` VARCHAR(2048) NULL,
    ADD COLUMN `images` JSON NULL;
