import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  FileText, 
  AlertTriangle, 
  BarChart3,
  Clock,
  CheckCircle,
  RefreshCw
} from "lucide-react";

// Import des composants créés
import { ProjectOverview } from "./project-overview";
import { AnalysisSection, MacroAnalysisSection, DetailedAnalysisSection } from "./analysis-sections";
import { MissingDocumentsSection, VigilancePointsSection } from "./documents-vigilance";

// Import des hooks d'API
import { 
  useWorkflowProgress, 
  useInitiateWorkflow,
  useTriggerAnalysisMacro,
  useTriggerAnalysisDescription,
  useTriggerMissingDocuments,
  useTriggerVigilancePoints
} from "@/api/workflow-ai";
import { queryClient } from "@/api/query-config";

interface EnhancedProjectDetailProps {
  projectUniqueId: string;
  project: {
    projectUniqueId: string;
    projectName: string;
    description: string;
    budgetTotal: number;
    estimatedRoi: number;
    startDate: Date;
    fundingExpectedDate: Date;
    company?: {
      name: string;
      siret: string;
      reputationScore?: number;
      reputationJustification?: string;
    };
    projectOwner?: {
      name: string;
      experienceYears: number;
      reputationScore?: number;
      reputationJustification?: string;
    };
  };
}

export const EnhancedProjectDetail = ({ projectUniqueId, project }: EnhancedProjectDetailProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Hooks pour le workflow
  const { data: workflowData, isLoading: workflowLoading, refetch: refetchWorkflow } = useWorkflowProgress(projectUniqueId);
  const { mutateAsync: initiateWorkflow, isPending: initiatingWorkflow } = useInitiateWorkflow({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-progress", projectUniqueId] });
    }
  });

  // Hooks pour les analyses IA
  const { mutateAsync: triggerMacroAnalysis } = useTriggerAnalysisMacro(projectUniqueId, {
    onSuccess: () => refetchWorkflow()
  });
  
  const { mutateAsync: triggerDescriptionAnalysis } = useTriggerAnalysisDescription(projectUniqueId, {
    onSuccess: () => refetchWorkflow()
  });
  
  const { mutateAsync: triggerMissingDocuments } = useTriggerMissingDocuments(projectUniqueId, {
    onSuccess: () => refetchWorkflow()
  });
  
  const { mutateAsync: triggerVigilancePoints } = useTriggerVigilancePoints(projectUniqueId, {
    onSuccess: () => refetchWorkflow()
  });

  // Gestion de l'initiation du workflow
  const handleStartAnalysis = async () => {
    try {
      await initiateWorkflow({ projectUniqueId });
      setActiveTab("analysis");
    } catch (error) {
      console.error('Erreur lors de l\'initiation du workflow:', error);
    }
  };

  // Récupération des données d'analyse depuis le workflow
  const getAnalysisData = (stepId: number) => {
    const step = workflowData?.steps.find(s => s.id === stepId);
    if (step?.status === 'completed' && step.content) {
      try {
        return JSON.parse(step.content);
      } catch {
        return null;
      }
    }
    return null;
  };

  const macroAnalysisData = getAnalysisData(1);
  const descriptionAnalysisData = getAnalysisData(2);
  const missingDocumentsData = getAnalysisData(3);
  const vigilancePointsData = getAnalysisData(4);

  // Calcul du progrès global
  const getProgressPercentage = () => {
    if (!workflowData) return 0;
    return Math.round((workflowData.completedSteps / workflowData.totalSteps) * 100);
  };

  const getStepStatus = (stepId: number) => {
    const step = workflowData?.steps.find(s => s.id === stepId);
    return step?.status || 'pending';
  };

  if (workflowLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Progress Bar */}
        {workflowData && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">Progression de l'analyse IA</h3>
                <Badge className="bg-blue-100 text-blue-800">
                  {workflowData.completedSteps}/{workflowData.totalSteps} étapes
                </Badge>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <p className="text-sm text-blue-700 mt-2">
                {getProgressPercentage()}% terminé
              </p>
            </CardContent>
          </Card>
        )}

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Analyses IA
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="vigilance" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Vigilance
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Workflow
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <ProjectOverview 
              project={project}
              onStartAnalysis={handleStartAnalysis}
              analysisInProgress={initiatingWorkflow}
            />
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              
              {/* Analyse Macro */}
              <AnalysisSection
                title="Analyse Macro"
                status={getStepStatus(1)}
                onTrigger={() => triggerMacroAnalysis({ projectUniqueId, macroAnalysis: {} as any })}
              >
                {macroAnalysisData && <MacroAnalysisSection data={macroAnalysisData} />}
              </AnalysisSection>

              {/* Analyse Détaillée */}
              <AnalysisSection
                title="Analyse Détaillée"
                status={getStepStatus(2)}
                onTrigger={() => triggerDescriptionAnalysis({ projectUniqueId, detailedAnalysis: {} as any })}
              >
                {descriptionAnalysisData && <DetailedAnalysisSection data={descriptionAnalysisData} />}
              </AnalysisSection>

            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <AnalysisSection
              title="Documents Manquants"
              status={getStepStatus(3)}
              onTrigger={() => triggerMissingDocuments({ projectUniqueId, missingDocuments: [] })}
            >
              {missingDocumentsData && <MissingDocumentsSection documents={missingDocumentsData} />}
            </AnalysisSection>
          </TabsContent>

          {/* Vigilance Tab */}
          <TabsContent value="vigilance" className="space-y-6">
            <AnalysisSection
              title="Points de Vigilance"
              status={getStepStatus(4)}
              onTrigger={() => triggerVigilancePoints({ projectUniqueId, vigilancePoints: [] })}
            >
              {vigilancePointsData && <VigilancePointsSection points={vigilancePointsData} />}
            </AnalysisSection>
          </TabsContent>

          {/* Workflow Tab */}
          <TabsContent value="workflow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  État du Workflow
                </CardTitle>
              </CardHeader>
              <CardContent>
                {workflowData ? (
                  <div className="space-y-4">
                    {workflowData.steps.map((step) => {
                      const getStatusIcon = () => {
                        switch (step.status) {
                          case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
                          case 'in_progress': return <Clock className="w-5 h-5 text-blue-600 animate-spin" />;
                          case 'failed': return <AlertTriangle className="w-5 h-5 text-red-600" />;
                          default: return <Clock className="w-5 h-5 text-gray-400" />;
                        }
                      };

                      const getStatusColor = () => {
                        switch (step.status) {
                          case 'completed': return 'border-green-200 bg-green-50';
                          case 'in_progress': return 'border-blue-200 bg-blue-50';
                          case 'failed': return 'border-red-200 bg-red-50';
                          default: return 'border-gray-200 bg-gray-50';
                        }
                      };

                      return (
                        <Card key={step.id} className={`${getStatusColor()}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon()}
                                <div>
                                  <h4 className="font-semibold">{step.name}</h4>
                                  <p className="text-sm text-gray-600">{step.description}</p>
                                </div>
                              </div>
                              <Badge 
                                className={
                                  step.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  step.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  step.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }
                              >
                                {step.status === 'completed' ? 'Terminé' :
                                 step.status === 'in_progress' ? 'En cours' :
                                 step.status === 'failed' ? 'Échoué' : 'En attente'}
                              </Badge>
                            </div>
                            {step.completedAt && (
                              <p className="text-xs text-gray-500 mt-2">
                                Terminé le {new Date(step.completedAt).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Aucun workflow initié pour ce projet</p>
                    <Button onClick={handleStartAnalysis} disabled={initiatingWorkflow}>
                      {initiatingWorkflow ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Initialisation...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 mr-2" />
                          Initier l'analyse IA
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}; 