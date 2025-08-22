CREATE TYPE "public"."document_status" AS ENUM('pending', 'resolved', 'irrelevant');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('UPLOADED', 'PROCESSED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('open', 'closed');--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'UPLOADED'::"public"."file_status";--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "status" SET DATA TYPE "public"."file_status" USING "status"::"public"."file_status";--> statement-breakpoint
ALTER TABLE "missing_documents" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."document_status";--> statement-breakpoint
ALTER TABLE "missing_documents" ALTER COLUMN "status" SET DATA TYPE "public"."document_status" USING "status"::"public"."document_status";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "status" SET DEFAULT 'open'::"public"."session_status";--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "status" SET DATA TYPE "public"."session_status" USING "status"::"public"."session_status";--> statement-breakpoint
ALTER TABLE "vigilance_points" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."document_status";--> statement-breakpoint
ALTER TABLE "vigilance_points" ALTER COLUMN "status" SET DATA TYPE "public"."document_status" USING "status"::"public"."document_status";