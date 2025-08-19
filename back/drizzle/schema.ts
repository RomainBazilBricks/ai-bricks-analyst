import { pgTable, unique, serial, varchar, text, integer, timestamp, foreignKey, uuid, numeric, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const documentStatus = pgEnum("document_status", ['pending', 'resolved', 'irrelevant'])
export const fileStatus = pgEnum("file_status", ['UPLOADED', 'PROCESSED', 'ERROR'])
export const projectTypology = pgEnum("project_typology", ['marchand_de_bien', 'projet_locatif', 'projet_exploitation', 'promotion_immobiliere'])
export const riskLevel = pgEnum("risk_level", ['low', 'medium', 'high'])
export const sessionStatus = pgEnum("session_status", ['open', 'closed'])
export const strengthWeaknessType = pgEnum("strength_weakness_type", ['strength', 'weakness'])


export const analysisSteps = pgTable("analysis_steps", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 256 }).notNull(),
	description: text().notNull(),
	prompt: text().notNull(),
	order: integer().notNull(),
	isActive: integer("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("analysis_steps_name_unique").on(table.name),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 256 }).notNull(),
	email: text().notNull(),
	password: text().notNull(),
});

export const projectAnalysisProgress = pgTable("project_analysis_progress", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	stepId: integer("step_id").notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	content: text(),
	manusConversationUrl: text("manus_conversation_url"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_analysis_progress_project_id_projects_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.stepId],
			foreignColumns: [analysisSteps.id],
			name: "project_analysis_progress_step_id_analysis_steps_id_fk"
		}).onDelete("cascade"),
	unique("project_analysis_progress_project_id_step_id_unique").on(table.projectId, table.stepId),
]);

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectUniqueId: varchar("project_unique_id", { length: 256 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	projectName: varchar("project_name", { length: 512 }).notNull(),
	description: text().notNull(),
	budgetTotal: numeric("budget_total", { precision: 15, scale:  2 }).notNull(),
	estimatedRoi: numeric("estimated_roi", { precision: 5, scale:  2 }).notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	fundingExpectedDate: timestamp("funding_expected_date", { mode: 'string' }).notNull(),
	typologie: projectTypology(),
	zipUrl: text("zip_url"),
}, (table) => [
	unique("projects_project_unique_id_unique").on(table.projectUniqueId),
]);

export const documents = pgTable("documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fileName: varchar("file_name", { length: 512 }).notNull(),
	url: text().notNull(),
	hash: varchar({ length: 256 }).notNull(),
	mimeType: varchar("mime_type", { length: 128 }).notNull(),
	size: integer().notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
	sessionId: uuid("session_id").notNull(),
	status: fileStatus().default('UPLOADED').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "documents_session_id_sessions_id_fk"
		}).onDelete("cascade"),
]);

export const missingDocuments = pgTable("missing_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	name: varchar({ length: 512 }).notNull(),
	whyMissing: text("why_missing").default(').notNull(),
	status: documentStatus().default('pending').notNull(),
	whyStatus: text("why_status").default(').notNull(),
	updatedBy: integer("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	impactOnProject: text("impact_on_project").default(').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "missing_documents_project_id_projects_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "missing_documents_updated_by_users_id_fk"
		}),
]);

export const aiCredentials = pgTable("ai_credentials", {
	id: serial().primaryKey().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	platform: varchar({ length: 50 }).notNull(),
	userIdentifier: varchar("user_identifier", { length: 255 }),
	credentialName: varchar("credential_name", { length: 255 }).default('default').notNull(),
	sessionData: jsonb("session_data").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }).defaultNow(),
	userAgent: text("user_agent"),
	notes: text(),
});

export const consolidatedData = pgTable("consolidated_data", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	financialAcquisitionPrice: numeric("financial_acquisition_price", { precision: 15, scale:  2 }),
	financialWorksCost: numeric("financial_works_cost", { precision: 15, scale:  2 }),
	financialPlannedResalePrice: numeric("financial_planned_resale_price", { precision: 15, scale:  2 }),
	financialPersonalContribution: numeric("financial_personal_contribution", { precision: 15, scale:  2 }),
	propertyLivingArea: numeric("property_living_area", { precision: 10, scale:  2 }),
	propertyMarketReferencePrice: numeric("property_market_reference_price", { precision: 15, scale:  2 }),
	propertyMonthlyRentExcludingTax: numeric("property_monthly_rent_excluding_tax", { precision: 10, scale:  2 }),
	propertyPresoldUnits: integer("property_presold_units"),
	propertyTotalUnits: integer("property_total_units"),
	propertyPreMarketingRate: numeric("property_pre_marketing_rate", { precision: 5, scale:  2 }),
	carrierExperienceYears: integer("carrier_experience_years"),
	carrierSuccessfulOperations: integer("carrier_successful_operations"),
	carrierHasActiveLitigation: boolean("carrier_has_active_litigation"),
	companyYearsOfExistence: integer("company_years_of_existence"),
	companyNetResultYear1: numeric("company_net_result_year_1", { precision: 15, scale:  2 }),
	companyNetResultYear2: numeric("company_net_result_year_2", { precision: 15, scale:  2 }),
	companyNetResultYear3: numeric("company_net_result_year_3", { precision: 15, scale:  2 }),
	companyTotalDebt: numeric("company_total_debt", { precision: 15, scale:  2 }),
	companyEquity: numeric("company_equity", { precision: 15, scale:  2 }),
	companyDebtRatio: numeric("company_debt_ratio", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "consolidated_data_project_id_projects_id_fk"
		}).onDelete("cascade"),
	unique("consolidated_data_project_id_unique").on(table.projectId),
]);

export const apiConfigurations = pgTable("api_configurations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 256 }).notNull(),
	url: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const companies = pgTable("companies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	name: varchar({ length: 512 }).notNull(),
	siret: varchar({ length: 14 }).notNull(),
	reputationDescription: text("reputation_description").default(').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "companies_project_id_projects_id_fk"
		}).onDelete("cascade"),
	unique("companies_siret_unique").on(table.siret),
]);

export const conversations = pgTable("conversations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	sessionDate: timestamp("session_date", { mode: 'string' }).notNull(),
	sender: varchar({ length: 256 }).notNull(),
	message: text().notNull(),
	attachments: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "conversations_session_id_sessions_id_fk"
		}).onDelete("cascade"),
]);

export const conversationsWithAi = pgTable("conversations_with_ai", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionId: uuid("session_id").notNull(),
	url: text().notNull(),
	model: varchar({ length: 50 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "conversations_with_ai_session_id_sessions_id_fk"
		}).onDelete("cascade"),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	name: varchar({ length: 256 }).default(').notNull(),
	description: text().default(').notNull(),
	status: sessionStatus().default('open').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "sessions_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const strengthsAndWeaknesses = pgTable("strengths_and_weaknesses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	title: varchar({ length: 256 }).notNull(),
	type: text().default(').notNull(),
	riskLevel: riskLevel("risk_level").notNull(),
	status: documentStatus().default('pending').notNull(),
	whyStatus: text("why_status").default(').notNull(),
	updatedBy: integer("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	potentialImpact: text("potential_impact").default(').notNull(),
	recommendations: jsonb().default([]).notNull(),
	description: text().default(').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "strengths_and_weaknesses_project_id_projects_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "strengths_and_weaknesses_updated_by_users_id_fk"
		}),
]);

export const projectOwners = pgTable("project_owners", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	name: varchar({ length: 256 }).notNull(),
	experienceYears: integer("experience_years").notNull(),
	reputationDescription: text("reputation_description").default(').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_owners_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);
