ALTER TABLE "project_analysis_progress" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_analysis_progress" ADD COLUMN "last_retry_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_analysis_progress" ADD COLUMN "max_retries" integer DEFAULT 2 NOT NULL;