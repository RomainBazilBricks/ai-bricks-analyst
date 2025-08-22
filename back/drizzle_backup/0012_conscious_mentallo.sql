CREATE TABLE "consolidated_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"financial_acquisition_price" numeric(15, 2),
	"financial_works_cost" numeric(15, 2),
	"financial_planned_resale_price" numeric(15, 2),
	"financial_personal_contribution" numeric(15, 2),
	"property_living_area" numeric(10, 2),
	"property_market_reference_price" numeric(15, 2),
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
	CONSTRAINT "consolidated_data_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "consolidated_data" ADD CONSTRAINT "consolidated_data_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;