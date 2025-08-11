import { pgTable, serial, text, varchar, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
});

/**
 * Projects Table - Represents an investment project or dossier
 */
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectUniqueId: varchar('project_unique_id', { length: 256 }).notNull().unique(),
  projectName: varchar('project_name', { length: 512 }).notNull(),
  conversationUrl: text('conversation_url'), // URL de la conversation avec l'outil externe
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Documents Table - Files attached to projects, stored in AWS S3
 */
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  fileName: varchar('file_name', { length: 512 }).notNull(),
  url: text('url').notNull(), // AWS S3 URL
  hash: varchar('hash', { length: 256 }).notNull(), // SHA-256 hash for duplicate detection
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  size: integer('size').notNull(), // File size in bytes
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

/**
 * Syntheses Table - AI-generated analysis attached to projects
 */
export const syntheses = pgTable('syntheses', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(), // Full synthesis text or JSON
  manusConversationUrl: text('manus_conversation_url'), // URL to ManusAI conversation
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Analysis Workflow Steps - Définit les étapes d'analyse disponibles
 */
export const analysisSteps = pgTable('analysis_steps', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull().unique(),
  description: text('description').notNull(),
  prompt: text('prompt').notNull(), // Prompt stocké pour cette étape
  order: integer('order').notNull(), // Ordre d'exécution (1, 2, 3, 4)
  isActive: integer('is_active').notNull().default(1), // 1 = actif, 0 = inactif
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Project Analysis Workflow - Suivi des étapes d'analyse pour chaque projet
 */
export const projectAnalysisWorkflow = pgTable('project_analysis_workflow', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  stepId: integer('step_id').references(() => analysisSteps.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, in_progress, completed, failed
  content: text('content'), // Contenu dynamique de la réponse de cette étape
  manusConversationUrl: text('manus_conversation_url'), // URL de conversation pour cette étape spécifique
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * AI Credentials Table - Stocke les credentials pour différentes plateformes IA
 */
export const aiCredentials = pgTable('ai_credentials', {
  id: serial('id').primaryKey(),
  
  // Métadonnées
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  
  // Identification
  platform: varchar('platform', { length: 50 }).notNull(), // 'chatgpt', 'claude', 'manus', 'perplexity', etc.
  userIdentifier: varchar('user_identifier', { length: 255 }), // email, user_id, etc.
  credentialName: varchar('credential_name', { length: 255 }).default('default').notNull(),
  
  // Données de session (structure flexible)
  sessionData: jsonb('session_data').notNull(), // Tous les tokens, cookies, etc.
  
  // Métadonnées utiles
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
  userAgent: text('user_agent'),
  notes: text('notes'),
});

// Zod Schemas for API Validation

// Schema for POST /projects (creating project with file URLs)
export const CreateProjectSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  projectName: z.string().min(1, 'ProjectName is required'),
  fileUrls: z.array(z.string().url('Must be valid URLs')).min(1, 'At least one file URL is required'),
});

// Schema for GET /projects/{projectUniqueId}/documents
export const GetDocumentsSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
});

// Schema for POST /projects/synthesis
export const PostSynthesisSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  synthesis: z.string().min(1, 'Synthesis content is required'),
  manusConversationUrl: z.string().url('Must be a valid URL').optional(),
});

// Schema for POST /projects/conversation-url
export const UpdateConversationUrlSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  conversationUrl: z.string().url('Must be a valid URL'),
});

// Types for responses
export type ProjectVisualizationType = {
  projectUniqueId: string;
  documents: { fileName: string; url: string }[];
  manusConversationUrls: string[];
  syntheses: { content: string; createdAt: Date }[];
};

// Enums
export enum FileStatus {
  UPLOADED = 'UPLOADED',
  PROCESSED = 'PROCESSED',
  ERROR = 'ERROR',
}

// Nouveaux schémas Zod pour le workflow d'analyse

// Schema pour créer une étape d'analyse
export const CreateAnalysisStepSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  order: z.number().int().positive('Order must be a positive integer'),
  isActive: z.number().int().min(0).max(1).default(1),
});

// Schema pour mettre à jour le statut d'une étape de workflow
export const UpdateWorkflowStepSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  stepId: z.number().int().positive('StepId must be a positive integer'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  content: z.string().optional(),
  manusConversationUrl: z.string().url('Must be a valid URL').optional(),
});

// Schema pour initier le workflow d'analyse d'un projet
export const InitiateWorkflowSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
});

// Schema pour récupérer le statut du workflow
export const GetWorkflowStatusSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
});

// Enums pour le workflow
export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Nouveaux schémas Zod pour les AI Credentials

// Schema pour créer un credential
export const CreateAiCredentialSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  userIdentifier: z.string().optional(),
  credentialName: z.string().default('default'),
  sessionData: z.record(z.string(), z.any()), // Structure flexible pour les données de session
  expiresAt: z.string().datetime().optional(),
  userAgent: z.string().optional(),
  notes: z.string().optional(),
});

// Schema pour mettre à jour un credential
export const UpdateAiCredentialSchema = z.object({
  platform: z.string().optional(),
  userIdentifier: z.string().optional(),
  credentialName: z.string().optional(),
  sessionData: z.record(z.string(), z.any()).optional(),
  expiresAt: z.string().datetime().optional(),
  userAgent: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Schema pour les query params de filtrage
export const GetAiCredentialsQuerySchema = z.object({
  platform: z.string().optional(),
  userIdentifier: z.string().optional(),
  isActive: z.string().optional().transform((val) => {
    if (val === undefined || val === '') return undefined;
    return val === 'true';
  }),
  cursor: z.string().optional(),
  limit: z.string().optional().transform((val) => {
    if (val === undefined || val === '') return 10;
    const num = parseInt(val, 10);
    return isNaN(num) ? 10 : Math.min(Math.max(num, 1), 100);
  }),
  direction: z.enum(['next', 'prev']).default('next').optional(),
});

// Enums pour les plateformes supportées
export enum AiPlatform {
  CHATGPT = 'chatgpt',
  CLAUDE = 'claude',
  MANUS = 'manus',
  PERPLEXITY = 'perplexity',
  GEMINI = 'gemini',
  MISTRAL = 'mistral',
}