-- Descricoes eram VARCHAR(191) e eram cortadas. Passam a VARCHAR(1000).
-- Projetos antigos sem descricao ficam vazios antes de aplicar NOT NULL.
UPDATE `Project` SET `description` = '' WHERE `description` IS NULL;

ALTER TABLE `Project` MODIFY `description` VARCHAR(1000) NOT NULL;

ALTER TABLE `Tutorial` MODIFY `description` VARCHAR(1000) NOT NULL;

