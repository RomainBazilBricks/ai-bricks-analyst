-- Migration pour supprimer les colonnes reputation_description inutilisées
-- Les colonnes reputation_justification contiennent les vraies données

-- Supprimer la colonne reputation_description de project_owners
ALTER TABLE "project_owners" DROP COLUMN IF EXISTS "reputation_description";

-- Supprimer la colonne reputation_description de companies  
ALTER TABLE "companies" DROP COLUMN IF EXISTS "reputation_description";
