-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."document_status" AS ENUM('pending', 'resolved', 'irrelevant');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('UPLOADED', 'PROCESSED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."project_typology" AS ENUM('marchand_de_bien', 'projet_locatif', 'projet_exploitation', 'promotion_immobiliere');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."strength_weakness_type" AS ENUM('strength', 'weakness');--> statement-breakpoint
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
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_analysis_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"step_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"content" text,
	"manus_conversation_url" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_analysis_progress_project_id_step_id_unique" UNIQUE("project_id","step_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_unique_id" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_name" varchar(512) NOT NULL,
	"description" text NOT NULL,
	"budget_total" numeric(15, 2) NOT NULL,
	"estimated_roi" numeric(5, 2) NOT NULL,
	"start_date" timestamp NOT NULL,
	"funding_expected_date" timestamp NOT NULL,
	"typologie" "project_typology",
	"zip_url" text,
	"conversation" text,
	"fiche" text,
	CONSTRAINT "projects_project_unique_id_unique" UNIQUE("project_unique_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar(512) NOT NULL,
	"url" text NOT NULL,
	"hash" varchar(256) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"session_id" uuid NOT NULL,
	"status" "file_status" DEFAULT 'UPLOADED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missing_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"why_missing" text DEFAULT '' NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"why_status" text DEFAULT '' NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"impact_on_project" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"platform" varchar(50) NOT NULL,
	"user_identifier" varchar(255),
	"credential_name" varchar(255) DEFAULT 'default' NOT NULL,
	"session_data" jsonb NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp DEFAULT now(),
	"user_agent" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "consolidated_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"financial_acquisition_price" numeric(15, 2),
	"financial_works_cost" numeric(15, 2),
	"financial_planned_resale_price" numeric(15, 2),
	"financial_personal_contribution" numeric(15, 2),
	"property_living_area" numeric(10, 2),
	"financial_acquisition_price_per_sqm" numeric(10, 2),
	"property_monthly_rent_excluding_tax" numeric(10, 2),
	"property_presold_units" integer,
	"property_total_units" integer,
	"property_pre_marketing_rate" numeric(5, 2),
	"carrier_experience_years" integer,
	"carrier_successful_operations" integer,
	"carrier_has_active_litigation" boolean,
	"company_years_of_existence" integer,
	"company_net_result_year_1" numeric(15, 2),
	"company_net_result_year_2" numeric(15, 2),
	"company_net_result_year_3" numeric(15, 2),
	"company_total_debt" numeric(15, 2),
	"company_equity" numeric(15, 2),
	"company_debt_ratio" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"financial_market_price_per_sqm" numeric(10, 2),
	CONSTRAINT "consolidated_data_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "api_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"session_date" timestamp NOT NULL,
	"sender" varchar(256) NOT NULL,
	"message" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations_with_ai" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"url" text NOT NULL,
	"model" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"siret" varchar(14) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reputation_score" integer,
	"reputation_justification" text,
	CONSTRAINT "companies_siret_unique" UNIQUE("siret")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(256) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "session_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"experience_years" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reputation_score" integer,
	"reputation_justification" text
);
--> statement-breakpoint
CREATE TABLE "strengths_and_weaknesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(256) NOT NULL,
	"type" "strength_weakness_type" NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"why_status" text DEFAULT '' NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"potential_impact" text DEFAULT '' NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_analysis_progress" ADD CONSTRAINT "project_analysis_progress_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_analysis_progress" ADD CONSTRAINT "project_analysis_progress_step_id_analysis_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."analysis_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missing_documents" ADD CONSTRAINT "missing_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missing_documents" ADD CONSTRAINT "missing_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consolidated_data" ADD CONSTRAINT "consolidated_data_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations_with_ai" ADD CONSTRAINT "conversations_with_ai_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_owners" ADD CONSTRAINT "project_owners_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strengths_and_weaknesses" ADD CONSTRAINT "strengths_and_weaknesses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strengths_and_weaknesses" ADD CONSTRAINT "strengths_and_weaknesses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
*/