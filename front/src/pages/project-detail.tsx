import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProjectById } from "@/api/projects";
import { useSendMessageToTool } from "@/api/external-tools";
import { WorkflowSteps } from "@/components/workflow-steps.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Building, 
  User, 
  MessageSquare,
  Send,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { queryClient } from "@/api/query-config";
import type { SendMessageInput, SendMessageResponse } from "@/api/external-tools";
import { useSaveAIConversation, useGetLatestAIConversation, useGetAIConversationsByProject } from "@/api/ai-conversations";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const ProjectDetailPage = () => {
  const { projectUniqueId } = useParams<{ projectUniqueId: string }>();
  const navigate = useNavigate();

  // États pour l'interface d'envoi de message
  const [message, setMessage] = useState('');
  const [platform, setPlatform] = useState('manus');
  const [showMessageInterface, setShowMessageInterface] = useState(false);
  
  // Protection contre les doubles clics
  const lastSubmitTime = useRef<number>(0);

  // Hook pour récupérer les détails du projet
  const {
    data: project,
    isLoading,
    isError,
    error,
    refetch
  } = useGetProjectById(projectUniqueId!, { enabled: !!projectUniqueId });

  // Hooks pour les conversations IA
  const { mutateAsync: saveAIConversation } = useSaveAIConversation();
  
  // D'abord récupérer toutes les conversations pour savoir s'il y en a
  const { data: allAIConversations } = useGetAIConversationsByProject(projectUniqueId!);
  
  // Ne récupérer la dernière conversation que s'il y en a au moins une
  const hasConversations = allAIConversations && allAIConversations.length > 0;
  const { data: latestAIConversation } = useGetLatestAIConversation(projectUniqueId!, {
    enabled: hasConversations, // ✅ Seulement si des conversations existent
  });
  
  // Utiliser la première conversation de la liste comme "dernière" si pas de réponse du hook latest
  const effectiveLatestConversation = latestAIConversation || (hasConversations ? allAIConversations[0] : null);

  // Hook pour envoyer un message à l'outil externe
  const { mutateAsync: sendMessage, isPending: isSending, isError: isSendError, error: sendError } = useSendMessageToTool({
    onSuccess: async (response: SendMessageResponse) => {
      try {
        console.log('✅ Message envoyé avec succès:', response);
        
        // Sauvegarder l'URL de conversation IA si disponible
        if (response.conversation_url) {
          try {
            await saveAIConversation({
              projectUniqueId: projectUniqueId!,
              conversationUrl: response.conversation_url,
              model: platform, // 'manus' ou autre plateforme
              taskId: response.task_id,
            });
            console.log('💾 URL de conversation IA sauvegardée avec succès');
            
            // Actualiser les conversations IA
            queryClient.invalidateQueries({ queryKey: ["ai-conversations", "project", projectUniqueId] });
          } catch (saveError) {
            console.error('❌ Erreur lors de la sauvegarde de l\'URL de conversation IA:', saveError);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ["projects", projectUniqueId] });
        
        setMessage('');
        setShowMessageInterface(false);
      } catch (error) {
        console.error('❌ Erreur lors du traitement de la réponse:', error);
      }
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSending) return;
    
    const now = Date.now();
    if (now - lastSubmitTime.current < 2000) {
      console.log('Envoi trop rapide, ignoré');
      return;
    }
    lastSubmitTime.current = now;
    
    if (!message.trim()) return;

    const messageData: SendMessageInput = {
      message: message.trim(),
      platform,
      projectUniqueId: projectUniqueId, // Rattacher à ce projet
    };

    try {
      await sendMessage(messageData);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
  };

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
    <div className="container mx-auto p-6 max-w-6xl">
      {/* En-tête avec navigation et actions */}
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux projets
        </Button>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowMessageInterface(!showMessageInterface)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {showMessageInterface ? "Masquer" : "Envoyer message"}
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
          
          <Button variant="outline" onClick={() => refetch()}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* Titre et informations principales */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {project.projectName}
        </h1>
        <p className="text-gray-500">ID: {project.projectUniqueId}</p>
      </div>

      {/* Interface d'envoi de message */}
      {showMessageInterface && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envoyer un message à l'outil externe
            </CardTitle>
            <CardDescription>
              Envoyez un message à ManusAI ou d'autres outils d'analyse. L'URL de conversation sera automatiquement associée au projet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Plateforme
                </label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une plateforme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manus">ManusAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message
                </label>
                <Textarea
                  placeholder="Tapez votre message ici..."
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {isSendError && (
                <Alert variant="destructive">
                  <AlertTitle>Erreur lors de l'envoi</AlertTitle>
                  <AlertDescription>
                    {(sendError as Error)?.message || 'Erreur inconnue'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSending} className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {isSending ? 'Envoi en cours...' : 'Envoyer le message'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowMessageInterface(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Workflow d'analyse IA */}
      <div className="mb-8">
        <WorkflowSteps projectUniqueId={projectUniqueId!} />
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Colonne principale - Informations du projet */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Description du projet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                {project.description || 'Aucune description disponible pour ce projet.'}
              </p>
            </CardContent>
          </Card>

          {/* Métriques financières */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Informations financières
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Budget Total</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(project.budgetTotal)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">ROI Estimé</p>
                      <p className="text-xl font-bold text-green-600">
                        {project.estimatedRoi}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline du projet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline du projet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="font-medium text-purple-900">Date de début</p>
                    <p className="text-sm text-purple-600">Lancement prévu du projet</p>
                  </div>
                  <p className="text-lg font-semibold text-purple-600">
                    {formatDate(project.startDate.toString())}
                  </p>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-orange-900">Financement attendu</p>
                    <p className="text-sm text-orange-600">Date limite pour obtenir le financement</p>
                  </div>
                  <p className="text-lg font-semibold text-orange-600">
                    {formatDate(project.fundingExpectedDate.toString())}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale - Métadonnées */}
        <div className="space-y-6">
          
          {/* Informations système */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Créé le</p>
                <p className="text-lg">{formatDate(project.createdAt.toString())}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Dernière modification</p>
                <p className="text-lg">{formatDate(project.updatedAt.toString())}</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>
                Raccourcis vers les fonctionnalités principales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => setShowMessageInterface(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Nouveau message
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Documents (Bientôt)
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analyses (Bientôt)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}; 