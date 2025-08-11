// Types partagés pour les projets
export type Project = {
  id: string;
  projectUniqueId: string;
  projectName: string;
  conversationUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Document = {
  id: string;
  projectId: string;
  fileName: string;
  url: string;
  hash: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
};

export type Synthesis = {
  id: string;
  projectId: string;
  content: string;
  manusConversationUrl: string | null;
  createdAt: Date;
};

// Input types
export type CreateProjectInput = {
  projectUniqueId: string;
  projectName: string;
  fileUrls: string[];
};

export type PostSynthesisInput = {
  projectUniqueId: string;
  synthesis: string;
  manusConversationUrl?: string;
};

// Response types
export type ProjectResponse = Project;

export type DocumentResponse = Document;

export type SynthesisResponse = Synthesis;

export type ProjectWithDocumentsResponse = Project & {
  documents: DocumentResponse[];
  syntheses: SynthesisResponse[];
};

export type ProjectVisualizationResponse = {
  projectUniqueId: string;
  documents: { fileName: string; url: string }[];
  manusConversationUrls: string[];
  syntheses: { content: string; createdAt: Date }[];
};

// Input type pour mettre à jour l'URL de conversation
export type UpdateProjectConversationInput = {
  projectUniqueId: string;
  conversationUrl: string;
};

// Pagination types
export type PaginatedProjectsResponse = {
  items: ProjectResponse[];
  nextCursor: string | null;
  hasMore: boolean;
};

// Types pour la route GET /api/files
export type ProjectFileUrls = {
  projectUniqueId: string;
  files: {
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }[];
};

export type AllProjectFilesResponse = ProjectFileUrls[];

export type SingleProjectFilesResponse = {
  projectUniqueId: string;
  files: {
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }[];
};

// Types pour le système de workflow d'analyse

export type AnalysisStep = {
  id: number;
  name: string;
  description: string;
  prompt: string;
  order: number;
  isActive: number;
  createdAt: Date;
};

export type ProjectAnalysisWorkflow = {
  id: string;
  projectId: string;
  stepId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  content: string | null;
  manusConversationUrl: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Input types pour le workflow
export type CreateAnalysisStepInput = {
  name: string;
  description: string;
  prompt: string;
  order: number;
  isActive?: number;
};

export type UpdateWorkflowStepInput = {
  projectUniqueId: string;
  stepId: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  content?: string;
  manusConversationUrl?: string;
};

export type InitiateWorkflowInput = {
  projectUniqueId: string;
};

// Response types pour le workflow
export type AnalysisStepResponse = AnalysisStep;

export type ProjectAnalysisWorkflowResponse = ProjectAnalysisWorkflow & {
  step: AnalysisStepResponse;
};

export type ProjectWorkflowStatusResponse = {
  projectUniqueId: string;
  projectId: string;
  steps: ProjectAnalysisWorkflowResponse[];
  overallStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
  completedSteps: number;
  totalSteps: number;
  currentStep: ProjectAnalysisWorkflowResponse | null;
};

// Types pour les endpoints spécifiques par étape
export type WorkflowStepEndpointInput = {
  projectUniqueId: string;
  content: string;
  manusConversationUrl?: string;
};

// Types pour les 4 étapes spécifiques
export type OverviewStepInput = WorkflowStepEndpointInput;
export type AnalysisStepInput = WorkflowStepEndpointInput;
export type DocumentsStepInput = WorkflowStepEndpointInput;
export type MessageStepInput = WorkflowStepEndpointInput;

export type OverviewStepResponse = ProjectAnalysisWorkflowResponse;
export type AnalysisStepResponse = ProjectAnalysisWorkflowResponse;
export type DocumentsStepResponse = ProjectAnalysisWorkflowResponse;
export type MessageStepResponse = ProjectAnalysisWorkflowResponse; 