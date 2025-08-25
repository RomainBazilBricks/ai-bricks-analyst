ALTER TABLE "companies" DROP CONSTRAINT "companies_siret_unique";--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "siret" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_project_id_name_unique" UNIQUE("project_id","name");