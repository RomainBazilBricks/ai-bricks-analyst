import { pgTable, serial, text, varchar, timestamp, uuid, integer, boolean, jsonb, decimal, pgEnum, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

// Enums
export enum FileStatus {
  UPLOADED = 'UPLOADED',
  PROCESSED = 'PROCESSED',
  ERROR = 'ERROR',
}

export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AiPlatform {
  CHATGPT = 'chatgpt',
  CLAUDE = 'claude',
  MANUS = 'manus',
  PERPLEXITY = 'perplexity',
  GEMINI = 'gemini',
  MISTRAL = 'mistral',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum DocumentStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  IRRELEVANT = 'irrelevant',
}

export enum SessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

// Définition des enums PostgreSQL
export const sessionStatusEnum = pgEnum('session_status', ['open', 'closed']);
export const fileStatusEnum = pgEnum('file_status', ['UPLOADED', 'PROCESSED', 'ERROR']);
export const documentStatusEnum = pgEnum('document_status', ['pending', 'resolved', 'irrelevant']);
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high']);

// Users Table - Represents administrators
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
});

// Projects Table - Represents an investment project or dossier
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectUniqueId: varchar('project_unique_id', { length: 256 }).notNull().unique(),
  projectName: varchar('project_name', { length: 512 }).notNull(),
  description: text('description').notNull(), // Project overview
  budgetTotal: decimal('budget_total', { precision: 15, scale: 2 }).notNull(), // Total budget
  estimatedRoi: decimal('estimated_roi', { precision: 5, scale: 2 }).notNull(), // ROI percentage
  startDate: timestamp('start_date').notNull(), // Start date
  fundingExpectedDate: timestamp('funding_expected_date').notNull(), // Date funding is needed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions Table - Represents a working session linked to a project, grouping documents and conversations
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 256 }).default('').notNull(), // Optional name for the session
  description: text('description').default('').notNull(), // Optional description for context
  status: sessionStatusEnum('status').notNull().default('open'), // Session status
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversations With AI Table - Stores AI conversation URLs and models linked to a session
export const conversations_with_ai = pgTable('conversations_with_ai', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(), // Conversation URL
  model: varchar('model', { length: 50 }).notNull(), // e.g., 'manus', 'chatgpt'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Project Owners Table - Represents the project owner
export const project_owners = pgTable('project_owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 256 }).notNull(),
  experienceYears: integer('experience_years').notNull(),
  reputationDescription: text('reputation_description').default('').notNull(), // Free text for reputation, optional
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Companies Table - Represents the company carrying the project
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 512 }).notNull(),
  siret: varchar('siret', { length: 14 }).notNull().unique(),
  reputationDescription: text('reputation_description').default('').notNull(), // Free text for reputation, optional
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Documents Table - Files attached to sessions, stored in AWS S3
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  fileName: varchar('file_name', { length: 512 }).notNull(),
  url: text('url').notNull(), // AWS S3 URL
  hash: varchar('hash', { length: 256 }).notNull(), // SHA-256 hash for duplicate detection
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  size: integer('size').notNull(), // File size in bytes
  status: fileStatusEnum('status').notNull().default('UPLOADED'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// Missing Documents Table - Documents required but not yet provided, linked to project
export const missing_documents = pgTable('missing_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 512 }).notNull(),
  whyMissing: text('why_missing').default('').notNull(), // Reason why document is missing, optional
  impactOnProject: text('impact_on_project').default('').notNull(), // Impact of missing document on project
  status: documentStatusEnum('status').notNull().default('pending'),
  whyStatus: text('why_status').default('').notNull(), // Justification for status, optional
  updatedBy: integer('updated_by').references(() => users.id), // User who updated the status
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Vigilance Points Table - Stores project alerts
export const vigilance_points = pgTable('vigilance_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  whyVigilance: text('why_vigilance').default('').notNull(), // Reason for vigilance, optional
  riskLevel: riskLevelEnum('risk_level').notNull(),
  potentialImpact: text('potential_impact').default('').notNull(), // Impact potential on project
  recommendations: jsonb('recommendations').default([]).notNull(), // Array of recommendation strings
  status: documentStatusEnum('status').notNull().default('pending'),
  whyStatus: text('why_status').default('').notNull(), // Justification for status, optional
  updatedBy: integer('updated_by').references(() => users.id), // User who updated the status
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversations Table - Stores conversation history linked to sessions
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
  sessionDate: timestamp('session_date').notNull(),
  sender: varchar('sender', { length: 256 }).notNull(),
  message: text('message').notNull(),
  attachments: jsonb('attachments').default([]), // Array of { fileName: string, url: string }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Analysis Workflow Steps - Defines available analysis steps
export const analysis_steps = pgTable('analysis_steps', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull().unique(),
  description: text('description').notNull(),
  prompt: text('prompt').notNull(),
  order: integer('order').notNull(),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Project Analysis Workflow - Tracks analysis steps for each project
export const project_analysis_workflow = pgTable('project_analysis_workflow', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  stepId: integer('step_id').references(() => analysis_steps.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  content: text('content'),
  manusConversationUrl: text('manus_conversation_url'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// AI Credentials Table - Stores credentials for AI platforms
export const ai_credentials = pgTable('ai_credentials', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  platform: varchar('platform', { length: 50 }).notNull(),
  userIdentifier: varchar('user_identifier', { length: 255 }),
  credentialName: varchar('credential_name', { length: 255 }).default('default').notNull(),
  sessionData: jsonb('session_data').notNull(),
  expiresAt: timestamp('expires_at'),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
  userAgent: text('user_agent'),
  notes: text('notes'),
});

// API Configuration Table - Stores external API configurations
export const api_configurations = pgTable('api_configurations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  url: text('url').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Consolidated Data Table - Stores structured project data extracted by AI
export const consolidated_data = pgTable('consolidated_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Données Financières
  financialAcquisitionPrice: decimal('financial_acquisition_price', { precision: 15, scale: 2 }),
  financialWorksCost: decimal('financial_works_cost', { precision: 15, scale: 2 }),
  financialPlannedResalePrice: decimal('financial_planned_resale_price', { precision: 15, scale: 2 }),
  financialPersonalContribution: decimal('financial_personal_contribution', { precision: 15, scale: 2 }),
  
  // Données du Bien
  propertyLivingArea: decimal('property_living_area', { precision: 10, scale: 2 }),
  propertyMarketReferencePrice: decimal('property_market_reference_price', { precision: 15, scale: 2 }),
  propertyMonthlyRentExcludingTax: decimal('property_monthly_rent_excluding_tax', { precision: 10, scale: 2 }),
  propertyPresoldUnits: integer('property_presold_units'),
  propertyTotalUnits: integer('property_total_units'),
  propertyPreMarketingRate: decimal('property_pre_marketing_rate', { precision: 5, scale: 2 }),
  
  // Données Porteur
  carrierExperienceYears: integer('carrier_experience_years'),
  carrierSuccessfulOperations: integer('carrier_successful_operations'),
  carrierHasActiveLitigation: boolean('carrier_has_active_litigation'),
  
  // Société Porteuse
  companyYearsOfExistence: integer('company_years_of_existence'),
  companyNetResultYear1: decimal('company_net_result_year_1', { precision: 15, scale: 2 }),
  companyNetResultYear2: decimal('company_net_result_year_2', { precision: 15, scale: 2 }),
  companyNetResultYear3: decimal('company_net_result_year_3', { precision: 15, scale: 2 }),
  companyTotalDebt: decimal('company_total_debt', { precision: 15, scale: 2 }),
  companyEquity: decimal('company_equity', { precision: 15, scale: 2 }),
  companyDebtRatio: decimal('company_debt_ratio', { precision: 5, scale: 2 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Zod Schemas for API Validation

// Schema for POST /projects (creating project with file URLs)
export const CreateProjectSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  projectName: z.string().min(1, 'ProjectName is required'),
  description: z.string().optional().default(''), // Optionnel avec valeur par défaut
  budgetTotal: z.number().optional().default(0), // Optionnel avec valeur par défaut
  estimatedRoi: z.number().optional().default(0), // Optionnel avec valeur par défaut
  startDate: z.string().optional().default(new Date().toISOString()), // Optionnel, défaut à aujourd'hui
  fundingExpectedDate: z.string().optional().default(new Date().toISOString()), // Optionnel, défaut à aujourd'hui
  fileUrls: z.array(z.string().url('Must be valid URLs')).min(1, 'At least one file URL is required'),
});

// Schema for POST /sessions
export const CreateSessionSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  name: z.string().optional(), // Optional name for the session
  description: z.string().optional(), // Optional description
  status: z.enum(['open', 'closed']).default('open'), // Session status
});

// Schema for POST /conversations-with-ai
export const CreateConversationWithAiSchema = z.object({
  sessionId: z.string().uuid('SessionId must be a valid UUID'),
  url: z.string().url('Must be a valid URL'),
  model: z.string().min(1, 'Model is required'), // e.g., 'manus', 'chatgpt'
});

// Schema for POST /project-owners
export const CreateProjectOwnerSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  name: z.string().min(1, 'Name is required'),
  experienceYears: z.number().int().nonnegative('Experience years must be non-negative'),
  reputationDescription: z.string().optional(), // Optional for IA flexibility
});

// Schema for POST /companies
export const CreateCompanySchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  name: z.string().min(1, 'Name is required'),
  siret: z.string().length(14, 'SIRET must be 14 characters'),
  reputationDescription: z.string().optional(), // Optional for IA flexibility
});

// Schema for POST /documents
export const CreateDocumentSchema = z.object({
  sessionId: z.string().uuid('SessionId must be a valid UUID'),
  fileName: z.string().min(1, 'FileName is required'),
  url: z.string().url('Must be a valid URL'),
  hash: z.string().min(1, 'Hash is required'),
  mimeType: z.string().min(1, 'MimeType is required'),
  size: z.number().int().positive('Size must be positive'),
  status: z.enum(['UPLOADED', 'PROCESSED', 'ERROR']).default('UPLOADED'),
});

// Schema for POST /missing-documents
export const CreateMissingDocumentSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  name: z.string().min(1, 'Name is required'),
  whyMissing: z.string().optional(), // Optional for IA flexibility
  status: z.enum(['pending', 'resolved', 'irrelevant']).default('pending'),
  whyStatus: z.string().optional(), // Optional for IA flexibility
  updatedBy: z.number().int().positive('UpdatedBy must be a valid user ID').optional(), // Optional for creation
});

// Schema for PATCH /missing-documents/{id}
export const UpdateMissingDocumentSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  missingDocumentId: z.string().uuid('MissingDocumentId must be a valid UUID'),
  status: z.enum(['pending', 'resolved', 'irrelevant']).optional(),
  whyStatus: z.string().optional(),
  updatedBy: z.number().int().positive('UpdatedBy must be a valid user ID'), // Required for updates
});

// Schema for POST /vigilance-points
export const CreateVigilancePointSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  title: z.string().min(1, 'Title is required'),
  whyVigilance: z.string().optional(), // Optional for IA flexibility
  riskLevel: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'resolved', 'irrelevant']).default('pending'),
  whyStatus: z.string().optional(), // Optional for IA flexibility
  updatedBy: z.number().int().positive('UpdatedBy must be a valid user ID').optional(), // Optional for creation
});

// Schema for PATCH /vigilance-points/{id}
export const UpdateVigilancePointSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  vigilancePointId: z.string().uuid('VigilancePointId must be a valid UUID'),
  status: z.enum(['pending', 'resolved', 'irrelevant']).optional(),
  whyStatus: z.string().optional(),
  updatedBy: z.number().int().positive('UpdatedBy must be a valid user ID'), // Required for updates
});

// Schema for POST /conversations
export const CreateConversationSchema = z.object({
  sessionId: z.string().uuid('SessionId must be a valid UUID'),
  sessionDate: z.string().datetime('Valid session date required'),
  sender: z.string().min(1, 'Sender is required'),
  message: z.string().min(1, 'Message is required'),
  attachments: z.array(z.object({ fileName: z.string(), url: z.string().url() })).default([]),
});

// Schema for GET /projects/{projectUniqueId}/details
export const GetProjectDetailsSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
});

// Schema for creating analysis step
export const CreateAnalysisStepSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  prompt: z.string().min(1, 'Prompt is required'),
  order: z.number().int().positive('Order must be a positive integer'),
  isActive: z.number().int().min(0).max(1).default(1),
});

// Schema for updating workflow step
export const UpdateWorkflowStepSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  stepId: z.number().int().positive('StepId must be a positive integer'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  content: z.string().optional(),
  manusConversationUrl: z.string().url('Must be a valid URL').optional(),
});

// Schema for initiating workflow
export const InitiateWorkflowSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
});

// Schema for getting workflow status
export const GetWorkflowStatusSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
});

// Schema for creating AI credential
export const CreateAiCredentialSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  userIdentifier: z.string().optional(),
  credentialName: z.string().default('default'),
  sessionData: z.record(z.string(), z.any()),
  expiresAt: z.string().datetime().optional(),
  userAgent: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for updating AI credential
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

// Schema for querying AI credentials
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

// Schema for creating API configuration
export const CreateApiConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Schema for updating API configuration
export const UpdateApiConfigSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.string().url('Must be a valid URL').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Schema for querying API configurations
export const GetApiConfigsQuerySchema = z.object({
  name: z.string().optional(),
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

// Schemas for AI workflow analysis payloads

// Schema for macro analysis payload (Step 1)
export const AnalysisMacroPayloadSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  macroAnalysis: z.string().min(1, 'Macro analysis content is required')
});

// Schema for detailed analysis payload (Step 2)
export const AnalysisDescriptionPayloadSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  detailedAnalysis: z.object({
    businessModel: z.object({
      description: z.string().min(1, 'Business model description is required'),
      revenueStreams: z.array(z.string().min(1)),
      keyPartners: z.array(z.string().min(1)),
      valueProposition: z.string().min(1, 'Value proposition is required'),
    }),
    marketAnalysis: z.object({
      targetMarket: z.string().min(1, 'Target market is required'),
      marketSize: z.string().min(1, 'Market size is required'),
      competitorAnalysis: z.string().min(1, 'Competitor analysis is required'),
      marketTrends: z.array(z.string().min(1)),
    }),
    technicalAnalysis: z.object({
      technologyStack: z.array(z.string().min(1)),
      technicalRisks: z.array(z.string().min(1)),
      developmentTimeline: z.string().min(1, 'Development timeline is required'),
      scalabilityAssessment: z.string().min(1, 'Scalability assessment is required'),
    }),
    financialProjections: z.object({
      revenueProjection: z.string().min(1, 'Revenue projection is required'),
      costStructure: z.string().min(1, 'Cost structure is required'),
      breakEvenAnalysis: z.string().min(1, 'Break-even analysis is required'),
      fundingRequirements: z.string().min(1, 'Funding requirements is required'),
    }),
    teamAssessment: z.object({
      keyPersonnel: z.array(z.string().min(1)),
      skillsGaps: z.array(z.string().min(1)),
      organizationalStructure: z.string().min(1, 'Organizational structure is required'),
    }),
  }),
});

// Schema for missing documents payload (Step 3)
export const MissingDocumentsPayloadSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  missingDocuments: z.array(z.object({
    name: z.string().min(1, 'Document name is required'),
    whyMissing: z.string().min(1, 'Reason for missing document is required'),
    impactOnProject: z.string().min(1, 'Impact on project is required'),
  })).min(1, 'At least one missing document is required'),
});

// Schema for vigilance points payload (Step 4)
export const VigilancePointsPayloadSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  vigilancePoints: z.array(z.object({
    title: z.string().min(1, 'Vigilance point title is required'),
    whyVigilance: z.string().min(1, 'Reason for vigilance is required'),
    riskLevel: z.enum(['low', 'medium', 'high']),
    potentialImpact: z.string().min(1, 'Potential impact is required'),
    recommendations: z.array(z.string().min(1)),
  })).min(1, 'At least one vigilance point is required'),
});

// Schema for consolidated data payload (Step 0 - before analysis)
export const ConsolidatedDataPayloadSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  consolidatedData: z.object({
    // Données Financières - toutes optionnelles car peuvent ne pas être trouvées
    financial: z.object({
      acquisitionPrice: z.number().optional(),
      worksCost: z.number().optional(),
      plannedResalePrice: z.number().optional(),
      personalContribution: z.number().optional(),
    }).optional(),
    
    // Données du Bien - toutes optionnelles
    property: z.object({
      livingArea: z.number().optional(),
      marketReferencePrice: z.number().optional(),
      monthlyRentExcludingTax: z.number().optional(),
      presoldUnits: z.number().int().optional(),
      totalUnits: z.number().int().optional(),
      preMarketingRate: z.number().min(0).max(100).optional(),
    }).optional(),
    
    // Données Porteur - toutes optionnelles
    carrier: z.object({
      experienceYears: z.number().int().nonnegative().optional(),
      successfulOperations: z.number().int().nonnegative().optional(),
      hasActiveLitigation: z.boolean().optional(),
    }).optional(),
    
    // Société Porteuse - toutes optionnelles
    company: z.object({
      yearsOfExistence: z.number().int().nonnegative().optional(),
      netResultYear1: z.number().optional(), // N-1
      netResultYear2: z.number().optional(), // N-2
      netResultYear3: z.number().optional(), // N-3
      totalDebt: z.number().optional(),
      equity: z.number().optional(),
      debtRatio: z.number().min(0).max(100).optional(),
    }).optional(),
  }),
});

// Schema for final message payload (Step 5) - Simplifié
export const FinalMessagePayloadSchema = z.object({
  projectUniqueId: z.string().min(1, 'ProjectUniqueId is required'),
  message: z.string().min(1, 'Final message content is required'),
});

// Types for responses
export type ProjectVisualizationType = {
  projectUniqueId: string;
  projectName: string;
  description: string;
  budgetTotal: number;
  estimatedRoi: number;
  startDate: Date;
  fundingExpectedDate: Date;
  company: { name: string; siret: string; reputationDescription: string };
  projectOwner: { name: string; experienceYears: number; reputationDescription: string };
  sessions: {
    id: string;
    name: string;
    description: string;
    status: string; // 'open' or 'closed'
    documents: { fileName: string; url: string; status: string }[];
    conversations: { sessionDate: Date; sender: string; message: string; attachments: { fileName: string; url: string }[] }[];
    conversationsWithAi: { url: string; model: string }[];
  }[];
  missingDocuments: { name: string; whyMissing: string; status: string; whyStatus: string; updatedBy?: number }[];
  vigilancePoints: { title: string; whyVigilance: string; riskLevel: string; status: string; whyStatus: string; updatedBy?: number }[];
};