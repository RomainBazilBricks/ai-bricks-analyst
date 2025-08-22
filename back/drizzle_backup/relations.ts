import { relations } from "drizzle-orm/relations";
import { projects, projectAnalysisProgress, analysisSteps, sessions, documents, missingDocuments, users, consolidatedData, conversations, conversationsWithAi, companies, projectOwners, strengthsAndWeaknesses } from "./schema";

export const projectAnalysisProgressRelations = relations(projectAnalysisProgress, ({one}) => ({
	project: one(projects, {
		fields: [projectAnalysisProgress.projectId],
		references: [projects.id]
	}),
	analysisStep: one(analysisSteps, {
		fields: [projectAnalysisProgress.stepId],
		references: [analysisSteps.id]
	}),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	projectAnalysisProgresses: many(projectAnalysisProgress),
	missingDocuments: many(missingDocuments),
	consolidatedData: many(consolidatedData),
	companies: many(companies),
	sessions: many(sessions),
	projectOwners: many(projectOwners),
	strengthsAndWeaknesses: many(strengthsAndWeaknesses),
}));

export const analysisStepsRelations = relations(analysisSteps, ({many}) => ({
	projectAnalysisProgresses: many(projectAnalysisProgress),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	session: one(sessions, {
		fields: [documents.sessionId],
		references: [sessions.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	documents: many(documents),
	conversations: many(conversations),
	conversationsWithAis: many(conversationsWithAi),
	project: one(projects, {
		fields: [sessions.projectId],
		references: [projects.id]
	}),
}));

export const missingDocumentsRelations = relations(missingDocuments, ({one}) => ({
	project: one(projects, {
		fields: [missingDocuments.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [missingDocuments.updatedBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	missingDocuments: many(missingDocuments),
	strengthsAndWeaknesses: many(strengthsAndWeaknesses),
}));

export const consolidatedDataRelations = relations(consolidatedData, ({one}) => ({
	project: one(projects, {
		fields: [consolidatedData.projectId],
		references: [projects.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one}) => ({
	session: one(sessions, {
		fields: [conversations.sessionId],
		references: [sessions.id]
	}),
}));

export const conversationsWithAiRelations = relations(conversationsWithAi, ({one}) => ({
	session: one(sessions, {
		fields: [conversationsWithAi.sessionId],
		references: [sessions.id]
	}),
}));

export const companiesRelations = relations(companies, ({one}) => ({
	project: one(projects, {
		fields: [companies.projectId],
		references: [projects.id]
	}),
}));

export const projectOwnersRelations = relations(projectOwners, ({one}) => ({
	project: one(projects, {
		fields: [projectOwners.projectId],
		references: [projects.id]
	}),
}));

export const strengthsAndWeaknessesRelations = relations(strengthsAndWeaknesses, ({one}) => ({
	project: one(projects, {
		fields: [strengthsAndWeaknesses.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [strengthsAndWeaknesses.updatedBy],
		references: [users.id]
	}),
}));