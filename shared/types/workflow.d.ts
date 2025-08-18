// Types pour les payloads du workflow d'analyse IA

// Étape 1 : Analyse macro du projet
export type AnalysisMacroPayload = {
  projectUniqueId: string;
  macroAnalysis: {
    overallRisk: 'low' | 'medium' | 'high';
    marketPotential: 'low' | 'medium' | 'high';
    technicalFeasibility: 'low' | 'medium' | 'high';
    financialViability: 'low' | 'medium' | 'high';
    competitiveAdvantage: 'low' | 'medium' | 'high';
    summary: string; // Résumé de l'analyse macro
    keyStrengths: string[]; // Points forts identifiés
    keyWeaknesses: string[]; // Points faibles identifiés
    recommendedActions: string[]; // Actions recommandées
  };
};

// Étape 2 : Description détaillée enrichie
export type AnalysisDescriptionPayload = {
  projectUniqueId: string;
  detailedAnalysis: {
    businessModel: {
      description: string;
      revenueStreams: string[];
      keyPartners: string[];
      valueProposition: string;
    };
    marketAnalysis: {
      targetMarket: string;
      marketSize: string;
      competitorAnalysis: string;
      marketTrends: string[];
    };
    technicalAnalysis: {
      technologyStack: string[];
      technicalRisks: string[];
      developmentTimeline: string;
      scalabilityAssessment: string;
    };
    financialProjections: {
      revenueProjection: string;
      costStructure: string;
      breakEvenAnalysis: string;
      fundingRequirements: string;
    };
    teamAssessment: {
      keyPersonnel: string[];
      skillsGaps: string[];
      organizationalStructure: string;
    };
  };
};

// Étape 3 : Documents manquants identifiés
export type MissingDocumentsPayload = {
  projectUniqueId: string;
  missingDocuments: Array<{
    name: string;
    whyMissing: string;
    priority: 'low' | 'medium' | 'high';
    category: 'legal' | 'financial' | 'technical' | 'business' | 'regulatory';
    impactOnProject: string;
    suggestedSources: string[];
  }>;
};

// Étape 4 : Points de vigilance identifiés
export type VigilancePointsPayload = {
  projectUniqueId: string;
  vigilancePoints: Array<{
    title: string;
    whyVigilance: string;
    riskLevel: 'low' | 'medium' | 'high';
    category: 'financial' | 'technical' | 'legal' | 'market' | 'operational' | 'regulatory';
    potentialImpact: string;
    mitigationStrategies: string[];
    monitoringRecommendations: string[];
  }>;
};

// Types de réponse pour les endpoints
export type AnalysisMacroResponse = {
  success: boolean;
  message: string;
  workflowStepId: string;
  data: AnalysisMacroPayload['macroAnalysis'];
};

export type AnalysisDescriptionResponse = {
  success: boolean;
  message: string;
  workflowStepId: string;
  data: AnalysisDescriptionPayload['detailedAnalysis'];
};

export type MissingDocumentsResponse = {
  success: boolean;
  message: string;
  workflowStepId: string;
  documentsCreated: number;
  data: Array<{
    id: string;
    name: string;
    status: 'pending' | 'resolved' | 'irrelevant';
  }>;
};

export type VigilancePointsResponse = {
  success: boolean;
  message: string;
  workflowStepId: string;
  pointsCreated: number;
  data: Array<{
    id: string;
    title: string;
    riskLevel: 'low' | 'medium' | 'high';
    status: 'pending' | 'resolved' | 'irrelevant';
  }>;
};

// Types pour le suivi global du workflow
export type WorkflowProgressResponse = {
  projectUniqueId: string;
  totalSteps: number;
  completedSteps: number;
  currentStep: {
    id: number;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  } | null;
  steps: Array<{
    id: number;
    name: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    completedAt: Date | null;
    hasResults: boolean;
    content: string | null;
  }>;
};

// Étape 0 : Upload ZIP des documents
export type UploadZipFromUrlPayload = {
  projectUniqueId: string;
};

export type UploadZipFromUrlResponse = {
  message: string;
  projectUniqueId: string;
  zipUrl: string;
  zipFileName: string;
  zipSize: number;
  documentCount: number;
  conversationUrl: string;
  nextStepTriggered: boolean;
}; 