import { useState } from 'react';
import { useGetWorkflowStatus, useInitiateWorkflow, useGetAnalysisSteps } from "@/api/workflow";
import { useSendPromptToAI, type AIPromptRequest } from "@/api/ai-interface";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Brain, 
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  BarChart3,
  FolderOpen,
  MessageCircle,
  Code,
  Loader2,
  ExternalLink,
  FileText
} from "lucide-react";
import { queryClient } from "@/api/query-config";

interface WorkflowStepsProps {
  projectUniqueId: string;
}

export const WorkflowSteps = ({ projectUniqueId }: WorkflowStepsProps) => {
  // États pour les prompts IA
  const [sendingPrompts, setSendingPrompts] = useState<Set<number>>(new Set());
  const [promptResults, setPromptResults] = useState<Map<number, { result: string; error?: string }>>(new Map());
  const [selectedPrompt, setSelectedPrompt] = useState<{ step: any; prompt: string } | null>(null);

  // Hook pour récupérer le statut du workflow
  const {
    data: workflowStatus,
    isLoading: isWorkflowLoading,
    isError: isWorkflowError,
    error: workflowError,
    refetch: refetchWorkflow
  } = useGetWorkflowStatus(projectUniqueId, { 
    enabled: !!projectUniqueId,
    // Traiter les 404 comme des cas normaux (pas d'erreur)
    onError: (error: any) => {
      if (error?.response?.status !== 404) {
        console.error('Erreur lors du chargement du workflow:', error);
      }
    }
  });

  // Hook pour récupérer les étapes d'analyse par défaut
  const {
    data: defaultSteps,
    isLoading: isStepsLoading,
    isError: isStepsError,
    error: stepsError
  } = useGetAnalysisSteps();

  // Hook pour initier le workflow
  const { mutateAsync: initiateWorkflow, isPending: isInitiating } = useInitiateWorkflow({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", "status", projectUniqueId] });
    },
  });

  // Hook pour envoyer des prompts à l'IA
  const { mutateAsync: sendPromptToAI } = useSendPromptToAI();

  const handleInitiateWorkflow = async () => {
    if (!projectUniqueId) return;
    
    try {
      await initiateWorkflow({ projectUniqueId });
    } catch (error) {
      console.error('Erreur lors de l\'initiation du workflow:', error);
    }
  };

  // Fonction pour envoyer un prompt à l'IA
  const handleSendPromptToAI = async (step: any) => {
    if (!projectUniqueId || !step) return;
    
    const stepId = step.step?.id || step.id;
    
    // Double vérification : si déjà en cours d'envoi, ne pas continuer
    if (sendingPrompts.has(stepId)) {
      console.log('⚠️ Tentative d\'envoi multiple détectée, requête ignorée');
      return;
    }
    
    // Marquer comme en cours d'envoi
    setSendingPrompts(prev => new Set(prev).add(stepId));
    
    try {
      // Remplacer les placeholders par les vraies valeurs
      const rawPrompt = step.step?.prompt || step.prompt;
      let processedPrompt = rawPrompt.replace(/{projectUniqueId}/g, projectUniqueId);
      
      // Remplacer {documentListUrl} par l'URL de la page des documents
      if (processedPrompt.includes('{documentListUrl}')) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://ai-bricks-analyst-production.up.railway.app';
        const documentListUrl = `${baseUrl}/api/projects/${projectUniqueId}/documents-list`;
        processedPrompt = processedPrompt.replace(/{documentListUrl}/g, documentListUrl);
      }
      
      const promptData: AIPromptRequest = {
        prompt: processedPrompt,
        projectUniqueId,
        stepId,
        stepName: step.step?.name || step.name,
      };
      
      const response = await sendPromptToAI(promptData);
      
      // Stocker le résultat
      setPromptResults(prev => {
        const newMap = new Map(prev);
        if (response.success) {
          newMap.set(stepId, { result: response.response });
        } else {
          newMap.set(stepId, { result: '', error: response.error });
        }
        return newMap;
      });
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi du prompt à l\'IA:', error);
      setPromptResults(prev => {
        const newMap = new Map(prev);
        newMap.set(stepId, { result: '', error: 'Erreur de connexion' });
        return newMap;
      });
    } finally {
      // Retirer de la liste des envois en cours
      setSendingPrompts(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  };

  // Fonction pour afficher le prompt
  const handleShowPrompt = (step: any) => {
    // Remplacer les placeholders par les vraies valeurs pour l'affichage
    const rawPrompt = step.step?.prompt || step.prompt || '';
    let processedPrompt = rawPrompt.replace(/{projectUniqueId}/g, projectUniqueId);
    
    // Remplacer {documentListUrl} par l'URL de la page des documents
    if (processedPrompt.includes('{documentListUrl}')) {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://ai-bricks-analyst-production.up.railway.app';
      const documentListUrl = `${baseUrl}/api/projects/${projectUniqueId}/documents-list`;
      processedPrompt = processedPrompt.replace(/{documentListUrl}/g, documentListUrl);
    }
    
    setSelectedPrompt({
      step,
      prompt: processedPrompt
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'in_progress':
        return 'border-blue-200 bg-blue-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStepIcon = (stepOrder: number) => {
    switch (stepOrder) {
      case 1:
        return <Eye className="h-5 w-5" />;
      case 2:
        return <BarChart3 className="h-5 w-5" />;
      case 3:
        return <FolderOpen className="h-5 w-5" />;
      case 4:
        return <MessageCircle className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  // Créer les étapes d'affichage (workflow existant ou étapes par défaut)
  const getDisplaySteps = () => {
    if (workflowStatus?.steps) {
      return workflowStatus.steps;
    }
    
    // Si pas de workflow mais qu'on a les étapes par défaut, les afficher comme "pending"
    if (defaultSteps) {
      return defaultSteps.map(step => ({
        id: `default-${step.id}`,
        projectId: '',
        stepId: step.id,
        status: 'pending' as const,
        content: null,
        manusConversationUrl: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        step: step
      }));
    }
    
    return [];
  };

  const displaySteps = getDisplaySteps();
  const hasWorkflow = !!workflowStatus;
  const completedSteps = hasWorkflow ? workflowStatus.completedSteps : 0;
  const totalSteps = hasWorkflow ? workflowStatus.totalSteps : (defaultSteps?.length || 4);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Workflow d'analyse
          </CardTitle>
          <CardDescription>
            Suivi des étapes d'analyse automatisée du projet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {((isWorkflowLoading && !(isWorkflowError && (workflowError as any)?.response?.status === 404)) || isStepsLoading) ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : isStepsError ? (
            <div className="text-center py-8">
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Erreur lors du chargement des étapes d'analyse</AlertTitle>
                <AlertDescription>
                  {(stepsError as Error)?.message || 'Impossible de charger les étapes d\'analyse'}
                </AlertDescription>
              </Alert>
              <Button onClick={() => window.location.reload()}>Recharger la page</Button>
            </div>
          ) : (isWorkflowError && (workflowError as any)?.response?.status !== 404) ? (
            <div className="text-center py-8">
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Erreur lors du chargement du workflow</AlertTitle>
                <AlertDescription>
                  {(workflowError as Error)?.message || 'Erreur inconnue'}
                </AlertDescription>
              </Alert>
              <div className="flex justify-center gap-2">
                <Button onClick={() => refetchWorkflow()}>Réessayer</Button>
                <Button 
                  variant="outline" 
                  onClick={handleInitiateWorkflow}
                  disabled={isInitiating}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  {isInitiating ? 'Initialisation...' : 'Initier le workflow'}
                </Button>
              </div>
            </div>
          ) : displaySteps.length === 0 && !(isWorkflowError && (workflowError as any)?.response?.status === 404) ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium text-gray-900 mb-2">Aucune étape disponible</p>
              <p className="text-sm text-gray-500 mb-4">
                Impossible de charger les étapes d'analyse
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Informations sur le workflow */}
              {!hasWorkflow && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-amber-900 mb-1">Workflow en attente d'initialisation</h3>
                      <p className="text-sm text-amber-700">
                        Ce projet a été créé avant la mise en place du workflow automatique. 
                        Cliquez sur "Initialiser" pour créer les étapes d'analyse.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleInitiateWorkflow}
                        disabled={isInitiating}
                        className="flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        {isInitiating ? 'Initialisation...' : 'Initialiser le workflow'}
                      </Button>
                      <Button 
                        onClick={() => refetchWorkflow()}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Brain className="h-4 w-4" />
                        Actualiser
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Statut global */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Progression globale</h3>
                  <span className="text-sm text-gray-500">
                    {completedSteps} / {totalSteps} étapes complétées
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Statut: <span className="font-medium capitalize">
                    {hasWorkflow ? workflowStatus.overallStatus.replace('_', ' ') : 'non initié'}
                  </span>
                </p>
              </div>

              {/* Liste des étapes */}
              <div className="space-y-3">
                {displaySteps.map((step) => (
                  <div 
                    key={step.id} 
                    className={`border rounded-lg p-4 transition-colors ${getStatusColor(step.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getStepIcon(step.step.order)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            {step.step.name}
                          </h4>
                          {getStatusIcon(step.status)}
                          {!hasWorkflow && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full ml-2">
                              Prêt à analyser
                            </span>
                          )}
                          
                          {/* Boutons d'action */}
                          <div className="flex items-center gap-1 ml-auto">
                            {/* Bouton pour voir le prompt */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              title="Voir le prompt"
                              onClick={() => handleShowPrompt(step)}
                            >
                              <Code className="h-3 w-3" />
                            </Button>
                            
                            {/* Bouton pour envoyer à l'IA */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              title="Envoyer à l'IA"
                              onClick={() => handleSendPromptToAI(step)}
                              disabled={sendingPrompts.has(Number(step.step?.id || step.id))}
                            >
                              {sendingPrompts.has(Number(step.step?.id || step.id)) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {step.step.description}
                        </p>
                        
                        {/* Affichage du prompt si pas de workflow initié */}
                        {!hasWorkflow && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              Voir le prompt d'analyse
                            </summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                              {(() => {
                                let processedPrompt = step.step.prompt.replace(/{projectUniqueId}/g, projectUniqueId);
                                if (processedPrompt.includes('{documentListUrl}')) {
                                  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://ai-bricks-analyst-production.up.railway.app';
                                  const documentListUrl = `${baseUrl}/api/projects/${projectUniqueId}/documents-list`;
                                  processedPrompt = processedPrompt.replace(/{documentListUrl}/g, documentListUrl);
                                }
                                return processedPrompt;
                              })()}
                            </div>
                          </details>
                        )}
                        
                        {/* Contenu de l'étape si disponible */}
                        {step.content && (
                          <div className="mt-3 p-3 bg-white rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-sm text-gray-700">Résultat de l'analyse</h5>
                              {step.manusConversationUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                >
                                  <a
                                    href={step.manusConversationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Conversation
                                  </a>
                                </Button>
                              )}
                            </div>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {step.content}
                            </div>
                          </div>
                        )}

                        {/* Résultat de l'IA si disponible */}
                        {(() => {
                          const stepId = Number(step.step?.id || step.id);
                          const aiResult = promptResults.get(stepId);
                          if (aiResult) {
                            return (
                              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Brain className="h-4 w-4 text-blue-600" />
                                  <h5 className="font-medium text-sm text-blue-800">Réponse de l'IA</h5>
                                </div>
                                {aiResult.error ? (
                                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                    <strong>Erreur:</strong> {aiResult.error}
                                  </div>
                                ) : (
                                  <div className="text-sm text-blue-700 whitespace-pre-wrap">
                                    {aiResult.result}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Timestamps */}
                        {hasWorkflow && (
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            {step.startedAt && (
                              <span>Démarré: {formatDate(step.startedAt.toString())}</span>
                            )}
                            {step.completedAt && (
                              <span>Terminé: {formatDate(step.completedAt.toString())}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal pour afficher le prompt */}
      {selectedPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Code className="h-5 w-5" />
                Prompt pour: {selectedPrompt.step.step?.name || selectedPrompt.step.name}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPrompt(null)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {selectedPrompt.prompt}
              </pre>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setSelectedPrompt(null)}>
                Fermer
              </Button>
              <Button 
                onClick={() => {
                  handleSendPromptToAI(selectedPrompt.step);
                  setSelectedPrompt(null);
                }}
                disabled={sendingPrompts.has(Number(selectedPrompt.step.step?.id || selectedPrompt.step.id))}
                className="flex items-center gap-2"
              >
                {sendingPrompts.has(Number(selectedPrompt.step.step?.id || selectedPrompt.step.id)) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Envoyer à l'IA
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 