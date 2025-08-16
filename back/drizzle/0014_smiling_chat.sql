ALTER TABLE "project_analysis_workflow" RENAME TO "project_analysis_progress";--> statement-breakpoint
ALTER TABLE "project_analysis_progress" DROP CONSTRAINT "project_analysis_workflow_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "project_analysis_progress" DROP CONSTRAINT "project_analysis_workflow_step_id_analysis_steps_id_fk";
--> statement-breakpoint
ALTER TABLE "project_analysis_progress" ADD CONSTRAINT "project_analysis_progress_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_analysis_progress" ADD CONSTRAINT "project_analysis_progress_step_id_analysis_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."analysis_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_analysis_progress" ADD CONSTRAINT "project_analysis_progress_project_id_step_id_unique" UNIQUE("project_id","step_id");