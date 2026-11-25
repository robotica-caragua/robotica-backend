-- Descricoes eram VARCHAR(191) e eram cortadas. Passam a TEXT.
ALTER TABLE `Project` MODIFY `description` TEXT NULL;

ALTER TABLE `Tutorial` MODIFY `description` TEXT NOT NULL;

