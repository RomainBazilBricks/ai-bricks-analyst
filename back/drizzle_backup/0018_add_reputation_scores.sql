-- Migration pour ajouter les scores de réputation et justifications détaillées

-- Ajouter les champs de réputation pour les porteurs de projet
ALTER TABLE "project_owners" ADD COLUMN "reputation_score" integer;
ALTER TABLE "project_owners" ADD COLUMN "reputation_justification" text;

-- Ajouter les champs de réputation pour les sociétés
ALTER TABLE "companies" ADD COLUMN "reputation_score" integer;
ALTER TABLE "companies" ADD COLUMN "reputation_justification" text;

-- Ajouter des contraintes pour s'assurer que le score est entre 0 et 10
ALTER TABLE "project_owners" ADD CONSTRAINT "project_owners_reputation_score_check" CHECK ("reputation_score" >= 0 AND "reputation_score" <= 10);
ALTER TABLE "companies" ADD CONSTRAINT "companies_reputation_score_check" CHECK ("reputation_score" >= 0 AND "reputation_score" <= 10);
