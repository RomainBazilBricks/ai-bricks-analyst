CREATE TYPE "public"."strength_weakness_type" AS ENUM('strength', 'weakness');--> statement-breakpoint
ALTER TABLE "vigilance_points" RENAME TO "strengths_and_weaknesses";--> statement-breakpoint
ALTER TABLE "strengths_and_weaknesses" RENAME COLUMN "why_vigilance" TO "type";--> statement-breakpoint
ALTER TABLE "strengths_and_weaknesses" DROP CONSTRAINT "vigilance_points_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "strengths_and_weaknesses" DROP CONSTRAINT "vigilance_points_updated_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "consolidated_data" ADD COLUMN "financial_acquisition_price_per_sqm" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "consolidated_data" ADD COLUMN "financial_market_price_per_sqm" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "zip_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "conversation" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "fiche" text;--> statement-breakpoint
ALTER TABLE "strengths_and_weaknesses" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "strengths_and_weaknesses" ADD CONSTRAINT "strengths_and_weaknesses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strengths_and_weaknesses" ADD CONSTRAINT "strengths_and_weaknesses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidated_data" DROP COLUMN "property_market_reference_price";