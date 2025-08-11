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
