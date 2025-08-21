import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProjectById, useDeleteProject } from "@/api/projects";
import { useRetryStep } from "@/api/external-tools";
import { WorkflowSteps } from "@/components/workflow-steps.tsx";
import { ProjectDocuments } from "@/components/project-documents";
import { ConsolidatedDataComponent } from "@/components/consolidated-data";
import { MissingDocuments } from "@/components/missing-documents";
import { VigilancePoints } from "@/components/vigilance-points";
import { StrengthsPoints } from "@/components/strengths-points";
import { ProjectConversations } from "@/components/project-conversations";
import { useDocumentTitle } from '@/hooks/use-document-title';

import { useGetWorkflowStatus } from "@/api/workflow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Building, 
  ExternalLink,
  ChevronDown,
  Trash2,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { queryClient } from "@/api/query-config";

import { useGetLatestAIConversation, useGetAIConversationsByProject } from "@/api/ai-conversations";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};





export const ProjectDetailPage = () => {
  const { projectUniqueId } = useParams<{ projectUniqueId: string }>();
  const navigate = useNavigate();

  // État pour la confirmation de suppression
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // État pour le header sticky
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  


  // Hook pour récupérer les détails du projet
  const {
    data: project,
    isLoading,
    isError,
    error
  } = useGetProjectById(projectUniqueId!, { enabled: !!projectUniqueId });

  // Définir le titre de la page dynamiquement avec le nom du projet
  useDocumentTitle(project?.projectName || 'Projet');

  // Hook pour récupérer les données du workflow (contient l'analyse)
  const {
    data: workflowStatus
  } = useGetWorkflowStatus(projectUniqueId!, { enabled: !!projectUniqueId });

  // Hooks pour les conversations IA
  
  // D'abord récupérer toutes les conversations pour savoir s'il y en a
  const { data: allAIConversations } = useGetAIConversationsByProject(projectUniqueId!);
  
  // Toujours appeler le hook mais désactiver la requête si pas de conversations
  const { data: latestAIConversation } = useGetLatestAIConversation(projectUniqueId!, {
    enabled: !!projectUniqueId && !!(allAIConversations && allAIConversations.length > 0),
  });
  
  // Calculer si on a des conversations
  const hasConversations = allAIConversations && allAIConversations.length > 0;
  
  // Utiliser la première conversation de la liste comme "dernière" si pas de réponse du hook latest
  const effectiveLatestConversation = latestAIConversation || (hasConversations ? allAIConversations[0] : null);

  // Hook pour supprimer le projet
  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject({
    onSuccess: () => {
      navigate('/projects');
    },
  });

  // ✅ Hook pour relancer l'étape 4 (Forces et faiblesses)
  const { mutateAsync: retryStep, isPending: isRetrying } = useRetryStep(
    projectUniqueId!, 
    4, 
    effectiveLatestConversation?.url, // ✅ Réutiliser le conversationUrl comme le bouton Play
    {
      onSuccess: () => {
        console.log('✅ Étape 4 relancée avec succès en mode debug');
        // Invalider les caches pour rafraîchir les données
        queryClient.invalidateQueries({ queryKey: ["strengths", projectUniqueId] });
      },
      onError: (error) => {
        console.error('❌ Erreur lors du relancement de l\'étape 4:', error);
      }
    }
  );





  // Fonction pour gérer la suppression du projet
  const handleDeleteProject = async () => {
    if (!projectUniqueId) return;
    
    try {
      await deleteProject({ projectUniqueId });
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
    }
  };

  // Fonction pour extraire les données d'analyse du workflow
  const getAnalysisData = () => {
    if (!workflowStatus?.steps) return null;
    
    // Chercher l'étape d'analyse globale (order = 1) qui est complétée
    const analysisStep = workflowStatus.steps.find(step => 
      step.step.order === 1 && 
      step.status === 'completed' && 
      step.content
    );
    
    if (!analysisStep || !analysisStep.content) return null;
    
    try {
      // Essayer d'abord de parser comme JSON
      return JSON.parse(analysisStep.content);
    } catch (error) {
      // Si ce n'est pas du JSON, c'est probablement du texte brut
      console.log('Contenu d\'analyse en texte brut détecté');
      return {
        summary: analysisStep.content,
        overallRisk: 'medium',
        marketPotential: 'high',
        technicalFeasibility: 'high',
        financialViability: 'high',
        competitiveAdvantage: 'medium'
      };
    }
  };

  // Mémoriser les données d'analyse pour éviter les recalculs répétés
  const analysisData = useMemo(() => {
    return getAnalysisData();
  }, [workflowStatus?.steps]);

  // Gérer le scroll pour le header sticky
  useEffect(() => {
    const handleScroll = () => {
      // Le header devient sticky après avoir scrollé de 200px (hauteur approximative du bandeau original)
      const scrollThreshold = 200;
      const currentScrollY = window.scrollY;
      
      setIsHeaderSticky(currentScrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {error?.message || 'Une erreur est survenue lors du chargement du projet.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert>
          <AlertTitle>Projet non trouvé</AlertTitle>
          <AlertDescription>
            Le projet demandé n'existe pas ou n'est plus accessible.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Bandeau original (non-sticky) - sans fond ni séparateur */}
      <div>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between py-3 gap-4">
            {/* Section gauche : Icône retour + Titre du projet */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button 
                onClick={() => navigate('/projects')}
                className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Retour aux projets"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {project.projectName}
                </h1>
                <p className="text-sm text-gray-500 truncate">ID: {project.projectUniqueId}</p>
              </div>
            </div>

            {/* Section droite : Boutons d'action */}
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => window.open(`https://financements.bricks.co/bricksteam?project_id=${projectUniqueId}`, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Voir sur l'EF
              </Button>
              
              {/* Bouton Ouvrir conversation avec dropdown - Seulement si des conversations existent */}
              {hasConversations && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ouvrir conversation
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Conversations IA</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {effectiveLatestConversation && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => window.open(effectiveLatestConversation.url, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">Dernière conversation</span>
                          <span className="text-xs text-gray-500">
                            {effectiveLatestConversation.model} - {formatDate(effectiveLatestConversation.createdAt.toString())}
                          </span>
                        </div>
                      </DropdownMenuItem>
                      
                      {allAIConversations && allAIConversations.length > 1 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Conversations précédentes</DropdownMenuLabel>
                          {allAIConversations.slice(1, 6).map((conversation) => (
                            <DropdownMenuItem 
                              key={conversation.id}
                              onClick={() => window.open(conversation.url, '_blank')}
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="text-sm">{conversation.model}</span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(conversation.createdAt.toString())}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                          
                          {allAIConversations.length > 6 && (
                            <DropdownMenuItem disabled>
                              <span className="text-xs text-gray-500">
                                ... et {allAIConversations.length - 6} autres
                              </span>
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </>
                  )}
                  
                  {!effectiveLatestConversation && (
                    <DropdownMenuItem disabled>
                      <span className="text-sm text-gray-500">Aucune conversation disponible</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirmation(true)}
                className="px-3"
                title="Supprimer le projet"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Header sticky (apparaît seulement après scroll) */}
      <div className={`fixed left-64 right-0 z-50 bg-white border-b border-gray-200 shadow-lg transition-all duration-500 ease-in-out ${
        isHeaderSticky 
          ? 'top-0 opacity-100 transform translate-y-0' 
          : '-top-16 opacity-0 transform -translate-y-full'
      }`}>
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-center justify-between py-2 gap-4">
              {/* Version compacte pour le sticky header */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button 
                  onClick={() => navigate('/projects')}
                  className="flex-shrink-0 p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Retour aux projets"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-semibold text-gray-900 truncate">
                    {project.projectName}
                  </h1>
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`https://financements.bricks.co/bricksteam?project_id=${projectUniqueId}`, '_blank')}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="hidden lg:inline text-xs">Voir sur l'EF</span>
                </Button>
                
                {hasConversations && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="hidden lg:inline text-xs">Conversation</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Conversations IA</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {effectiveLatestConversation && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => window.open(effectiveLatestConversation.url, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">Dernière conversation</span>
                            <span className="text-xs text-gray-500">
                              {effectiveLatestConversation.model} - {formatDate(effectiveLatestConversation.createdAt.toString())}
                            </span>
                          </div>
                        </DropdownMenuItem>
                        
                        {allAIConversations && allAIConversations.length > 1 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Conversations précédentes</DropdownMenuLabel>
                            {allAIConversations.slice(1, 6).map((conversation) => (
                              <DropdownMenuItem 
                                key={conversation.id}
                                onClick={() => window.open(conversation.url, '_blank')}
                                className="flex items-center gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <div className="flex flex-col">
                                  <span className="text-sm">{conversation.model}</span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(conversation.createdAt.toString())}
                                  </span>
                                </div>
                              </DropdownMenuItem>
                            ))}
                            
                            {allAIConversations.length > 6 && (
                              <DropdownMenuItem disabled>
                                <span className="text-xs text-gray-500">
                                  ... et {allAIConversations.length - 6} autres
                                </span>
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </>
                    )}
                    
                    {!effectiveLatestConversation && (
                      <DropdownMenuItem disabled>
                        <span className="text-sm text-gray-500">Aucune conversation disponible</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="h-8 w-8 p-0"
                  title="Supprimer le projet"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto p-6 max-w-6xl">



      {/* Modal de confirmation de suppression */}
      {showDeleteConfirmation && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              Confirmer la suppression du projet
            </CardTitle>
            <CardDescription className="text-red-600">
              ⚠️ Cette action est irréversible. Toutes les données du projet seront définitivement supprimées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-white border border-red-200 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Les données suivantes seront supprimées :</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Le projet "{project?.projectName}"</li>
                  <li>• Tous les documents associés</li>
                  <li>• Toutes les sessions d'analyse</li>
                  <li>• Le workflow d'analyse et ses résultats</li>
                  <li>• Toutes les conversations IA liées au projet</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Suppression en cours...' : 'Confirmer la suppression'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={isDeleting}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents du projet */}
      <div data-section="documents" className="mb-8">
        <ProjectDocuments projectUniqueId={projectUniqueId!} />
      </div>

      {/* Workflow d'analyse IA */}
      <div className="mb-8">
        <WorkflowSteps 
          projectUniqueId={projectUniqueId!} 
          latestConversationUrl={effectiveLatestConversation?.url}
        />
      </div>

      {/* Section unifiée : Infos clés, Description, Données consolidées, Points de vigilance */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* 1. Informations clés du projet */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informations clés du projet
              </h3>
              
              <div className="space-y-6">
                {/* Informations générales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Typologie du projet */}
                  {project.typologie && (
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building className="h-6 w-6 text-indigo-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Typologie</p>
                          <p className="text-sm font-semibold text-indigo-900">
                            {project.typologie === 'marchand_de_bien' && 'Marchand de bien'}
                            {project.typologie === 'projet_locatif' && 'Projet locatif'}
                            {project.typologie === 'projet_exploitation' && 'Projet d\'exploitation'}
                            {project.typologie === 'promotion_immobiliere' && 'Promotion immobilière'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Société porteuse */}
                  {project.company && (
                    <div className="p-4 bg-cyan-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building className="h-6 w-6 text-cyan-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Société porteuse</p>
                          <p className="text-sm font-semibold text-cyan-900">{project.company.name}</p>
                          <p className="text-xs text-cyan-700">SIRET: {project.company.siret}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Porteur de projet */}
                  {project.projectOwner && (
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building className="h-6 w-6 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">Porteur de projet</p>
                          <p className="text-sm font-semibold text-emerald-900">{project.projectOwner.name}</p>
                          <p className="text-xs text-emerald-700">{project.projectOwner.experienceYears} ans d'expérience</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>


              </div>
            </div>

            {/* 2. Description du projet */}
            <div>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
                    <Building className="h-5 w-5" />
                    Description du projet
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-700 leading-relaxed">
                    {analysisData?.summary || project.description || 'Aucune description disponible pour ce projet.'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Séparateur */}
            <div className="border-t border-gray-200"></div>

            {/* 3. Données consolidées */}
            <div>
              <ConsolidatedDataComponent 
                projectUniqueId={projectUniqueId!} 
                latestConversationUrl={effectiveLatestConversation?.url}
              />
            </div>

            {/* Séparateur */}
            <div className="border-t border-gray-200"></div>

            {/* 4. Points forts et de vigilance en 2 colonnes */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analyse des forces et faiblesses
                </h3>
                {/* ✅ Bouton Relancer - Version discrète */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => retryStep()}
                  disabled={isRetrying}
                  className="flex items-center gap-1 h-7 px-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 opacity-60 hover:opacity-100 transition-all"
                  title="Relancer l'analyse des forces et faiblesses"
                >
                  <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">{isRetrying ? 'Relance...' : 'Relancer'}</span>
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne gauche : Points forts */}
                <div>
                  <StrengthsPoints projectUniqueId={projectUniqueId!} />
                </div>
                
                {/* Colonne droite : Points de vigilance */}
                <div>
                  <VigilancePoints projectUniqueId={projectUniqueId!} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents manquants */}
      <div className="mb-8">
        <MissingDocuments 
          projectUniqueId={projectUniqueId!} 
          latestConversationUrl={effectiveLatestConversation?.url}
        />
      </div>

        {/* Messagerie - Conversations */}
        <div className="mb-8">
          <ProjectConversations 
            projectUniqueId={projectUniqueId!} 
            latestConversationUrl={effectiveLatestConversation?.url}
          />
        </div>
      </div>
    </div>
  );
}; 