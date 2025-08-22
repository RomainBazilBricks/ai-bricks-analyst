CREATE TABLE "analysis_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"prompt" text NOT NULL,
	"order" integer NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_steps_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "project_analysis_workflow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"step_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"content" text,
	"manus_conversation_url" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_analysis_workflow" ADD CONSTRAINT "project_analysis_workflow_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_analysis_workflow" ADD CONSTRAINT "project_analysis_workflow_step_id_analysis_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."analysis_steps"("id") ON DELETE cascade ON UPDATE no action;