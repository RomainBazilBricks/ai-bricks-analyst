-- Migration pour inverser l'ordre des étapes 1 et 2 du workflow d'analyse
-- Étape 1: "Vue d'ensemble" devient ordre 2
-- Étape 2: "Analyse globale" devient ordre 1

-- Utiliser une valeur temporaire pour éviter les conflits de contrainte unique
UPDATE "analysis_steps" SET "order" = 999 WHERE "order" = 1;
UPDATE "analysis_steps" SET "order" = 1 WHERE "order" = 2;
UPDATE "analysis_steps" SET "order" = 2 WHERE "order" = 999;

-- Mettre à jour également les données du workflow existant si nécessaire
-- Les étapes du projet_analysis_workflow restent liées par stepId, donc pas de changement requis 