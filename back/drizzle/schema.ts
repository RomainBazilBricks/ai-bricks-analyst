import { pgTable, unique, serial, varchar, text, integer, timestamp, uuid, foreignKey, boolean, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



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

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectUniqueId: varchar("project_unique_id", { length: 256 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	conversationUrl: text("conversation_url"),
	projectName: varchar("project_name", { length: 512 }).notNull(),
}, (table) => [
	unique("projects_project_unique_id_unique").on(table.projectUniqueId),
]);

export const syntheses = pgTable("syntheses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	content: text().notNull(),
	manusConversationUrl: text("manus_conversation_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "syntheses_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const documents = pgTable("documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	fileName: varchar("file_name", { length: 512 }).notNull(),
	url: text().notNull(),
	hash: varchar({ length: 256 }).notNull(),
	mimeType: varchar("mime_type", { length: 128 }).notNull(),
	size: integer().notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "documents_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const projectAnalysisWorkflow = pgTable("project_analysis_workflow", {
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
			name: "project_analysis_workflow_project_id_projects_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.stepId],
			foreignColumns: [analysisSteps.id],
			name: "project_analysis_workflow_step_id_analysis_steps_id_fk"
		}).onDelete("cascade"),
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
