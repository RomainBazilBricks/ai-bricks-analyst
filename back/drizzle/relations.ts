import { relations } from "drizzle-orm/relations";
import { projects, syntheses, documents, projectAnalysisWorkflow, analysisSteps } from "./schema";

export const synthesesRelations = relations(syntheses, ({one}) => ({
	project: one(projects, {
		fields: [syntheses.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	syntheses: many(syntheses),
	documents: many(documents),
	projectAnalysisWorkflows: many(projectAnalysisWorkflow),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	project: one(projects, {
		fields: [documents.projectId],
		references: [projects.id]
	}),
}));

export const projectAnalysisWorkflowRelations = relations(projectAnalysisWorkflow, ({one}) => ({
	project: one(projects, {
		fields: [projectAnalysisWorkflow.projectId],
		references: [projects.id]
	}),
	analysisStep: one(analysisSteps, {
		fields: [projectAnalysisWorkflow.stepId],
		references: [analysisSteps.id]
	}),
}));

export const analysisStepsRelations = relations(analysisSteps, ({many}) => ({
	projectAnalysisWorkflows: many(projectAnalysisWorkflow),
}));