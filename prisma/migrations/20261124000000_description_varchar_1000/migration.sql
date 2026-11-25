-- Descricoes eram VARCHAR(191) e eram cortadas. Passam a VARCHAR(1000).
ALTER TABLE `Project` MODIFY `description` VARCHAR(1000) NULL;

ALTER TABLE `Tutorial` MODIFY `description` VARCHAR(1000) NOT NULL;

