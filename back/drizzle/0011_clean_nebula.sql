ALTER TABLE "missing_documents" ADD COLUMN "impact_on_project" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vigilance_points" ADD COLUMN "potential_impact" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "vigilance_points" ADD COLUMN "recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL;