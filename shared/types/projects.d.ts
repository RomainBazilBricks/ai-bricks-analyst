// Types partagés pour les projets
export type ProjectTypology = 
  | 'marchand_de_bien'
  | 'projet_locatif' 
  | 'projet_exploitation'
  | 'promotion_immobiliere';

export type Project = {
  id: string;
  projectUniqueId: string;
  projectName: string;
  description: string;
  typologie?: ProjectTypology;
  budgetTotal: number;
  estimatedRoi: number;
  startDate: Date;
  fundingExpectedDate: Date;
  zipUrl?: string; // URL du dernier ZIP généré pour ce projet
  conversation?: string; // Historique des conversations avec le porteur de projet
  fiche?: string; // Fiche de présentation du projet par le porteur
  createdAt: Date;
  updatedAt: Date;
  // Relations
  company?: {
    id: string;
    name: string;
    siret: string;
    reputationDescription: string;
  };
  projectOwner?: {
    id: string;
    name: string;
    experienceYears: number;
    reputationDescription: string;
  };
};

export type Document = {
  id: string;
  projectId: string;
  fileName: string;
  url: string;
  hash: string;
  mimeType: string;
  size: number;
  status: 'UPLOADED' | 'PROCESSED' | 'ERROR';
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
  description?: string; // Optionnel
  budgetTotal?: number; // Optionnel
  estimatedRoi?: number; // Optionnel
  startDate?: string; // Optionnel
  fundingExpectedDate?: string; // Optionnel
  fileUrls: string[];
  conversation?: string; // Historique des conversations avec le porteur de projet
  conversations?: string; // Alias pour conversation (compatibilité Bubble)
  fiche?: string; // Fiche de présentation du projet par le porteur
};

export type PostSynthesisInput = {
  projectUniqueId: string;
  synthesis: string;
  manusConversationUrl?: string;
};

// Response types
export type ProjectResponse = Project & {
  budgetTotal: number;
  estimatedRoi: number;
};

export type DocumentResponse = Document;

export type SynthesisResponse = Synthesis;

export type ProjectWithDocumentsResponse = ProjectResponse & {
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

export type DeleteProjectInput = {
  projectUniqueId: string;
};

export type DeleteProjectResponse = {
  success: boolean;
  message: string;
  deletedItems: {
    project: boolean;
    sessions: number;
    documents: number;
    workflow: number;
    conversations: number;
  };
};

export type DeleteDocumentInput = {
  projectUniqueId: string;
  documentId: string;
};

export type DeleteDocumentResponse = {
  success: boolean;
  message: string;
  deletedDocument: {
    id: string;
    fileName: string;
  };
};

export type DeleteAllDocumentsResponse = {
  success: boolean;
  message: string;
  deletedCount: number;
  deletedDocuments: {
    id: string;
    fileName: string;
  }[];
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

// Type pour la réponse simplifiée des URLs de documents (pour les prompts d'IA)
export type ProjectDocumentUrls = {
  projectUniqueId: string;
  documentUrls: string[];
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

export type ProjectAnalysisProgress = {
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
export type AnalysisStepDefinitionResponse = AnalysisStep;

export type ProjectAnalysisProgressResponse = ProjectAnalysisProgress & {
  step: AnalysisStepDefinitionResponse;
};

export type ProjectWorkflowStatusResponse = {
  projectUniqueId: string;
  projectId: string;
  steps: ProjectAnalysisProgressResponse[];
  overallStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
  completedSteps: number;
  totalSteps: number;
  currentStep: ProjectAnalysisProgressResponse | null;
};

// Types pour les endpoints spécifiques par étape
export type WorkflowStepEndpointInput = {
  projectUniqueId: string;
  content: string;
  manusConversationUrl?: string;
};

// Types pour les 5 étapes spécifiques
export type OverviewStepInput = WorkflowStepEndpointInput;
export type AnalysisStepInput = WorkflowStepEndpointInput;
export type DocumentsStepInput = WorkflowStepEndpointInput;
export type VigilanceStepInput = WorkflowStepEndpointInput;
export type MessageStepInput = WorkflowStepEndpointInput;

export type OverviewStepResponse = ProjectAnalysisProgressResponse;
export type AnalysisStepResponse = ProjectAnalysisProgressResponse;
export type DocumentsStepResponse = ProjectAnalysisProgressResponse;
export type VigilanceStepResponse = ProjectAnalysisProgressResponse;
export type MessageStepResponse = ProjectAnalysisProgressResponse;

// Types pour les conversations IA
export type SaveConversationInput = {
  projectUniqueId: string;
  conversationUrl: string;
  model: string; // 'manus', 'chatgpt', etc.
  taskId?: string; // Optionnel, pour lier avec le task_id de la réponse
};

export type ConversationResponse = {
  id: string;
  sessionId: string;
  url: string;
  model: string;
  createdAt: Date;
};

// Types pour les points forts
export type StrengthPoint = {
  id: string;
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  potentialImpact: string;
  recommendations: string[];
  status: 'pending' | 'resolved' | 'irrelevant';
  whyStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}; 