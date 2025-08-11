import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProjectById, useUpdateProjectConversationUrl } from "@/api/projects";
import { useSendMessageToTool } from "@/api/external-tools";
import { WorkflowSteps } from "@/components/workflow-steps.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Download, 
  ExternalLink, 
  FileText, 
  Brain, 
  Send, 
  MessageSquare
} from "lucide-react";
import { queryClient } from "@/api/query-config";
import type { SendMessageInput } from "@/api/external-tools";

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
    data: projectDetails,
    isLoading,
    isError,
    error,
    refetch
  } = useGetProjectById(projectUniqueId!, { enabled: !!projectUniqueId });



  // Hook pour envoyer un message à l'outil externe
  const { mutateAsync: sendMessage, isPending: isSending, isError: isSendError, error: sendError } = useSendMessageToTool({
    onSuccess: async (response: any) => {
      try {
        await updateConversationUrl({
          projectUniqueId: projectUniqueId!,
          conversationUrl: response.conversation_url,
        });
        
        queryClient.invalidateQueries({ queryKey: ["projects", projectUniqueId] });
        
        setMessage('');
        setShowMessageInterface(false);
      } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'URL de conversation:', error);
      }
    },
  });

  // Hook pour mettre à jour l'URL de conversation du projet
  const { mutateAsync: updateConversationUrl } = useUpdateProjectConversationUrl();

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
    };

    try {
      await sendMessage(messageData);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
    }
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

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };



  if (!projectUniqueId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>Identifiant de projet manquant</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Erreur lors du chargement</AlertTitle>
          <AlertDescription>
            {(error as Error).message}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={() => refetch()}>Réessayer</Button>
          <Button variant="outline" onClick={() => navigate('/projects')}>
            Retour à la liste
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col p-6 gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        
        <div className="grid gap-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!projectDetails) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Projet non trouvé</AlertTitle>
          <AlertDescription>
            Le projet avec l'identifiant "{projectUniqueId}" n'existe pas.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-6 gap-6 max-w-6xl mx-auto">
      {/* Header avec navigation */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {projectDetails.projectUniqueId}
          </h1>
          <p className="text-gray-500">ID: {projectDetails.id}</p>
        </div>
        <div className="flex gap-2">
          {projectDetails.conversationUrl && (
            <Button 
              variant="default"
              size="sm"
              asChild
            >
              <a
                href={projectDetails.conversationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir conversation
              </a>
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowMessageInterface(!showMessageInterface)}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {showMessageInterface ? "Masquer" : "Envoyer message"}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* Interface d'envoi de message */}
      {showMessageInterface && (
        <Card>
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

      {/* Workflow d'analyse */}
      <WorkflowSteps projectUniqueId={projectUniqueId} />

      {/* Informations générales */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Informations générales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Date de création</p>
            <p className="text-lg">{formatDate(projectDetails.createdAt.toString())}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Dernière modification</p>
            <p className="text-lg">{formatDate(projectDetails.updatedAt.toString())}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Nombre de documents</p>
            <p className="text-lg font-semibold text-blue-600">{projectDetails.documents.length}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Nombre de synthèses</p>
            <p className="text-lg font-semibold text-green-600">{projectDetails.syntheses.length}</p>
          </div>
        </div>

        {/* URL de conversation si disponible */}
        {projectDetails.conversationUrl && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium text-green-900">Conversation active</p>
                  <p className="text-sm text-green-700">Une conversation est en cours avec l'outil d'analyse</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                <a
                  href={projectDetails.conversationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir conversation
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Download className="h-5 w-5" />
          Documents ({projectDetails.documents.length})
        </h2>
        {projectDetails.documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">Aucun document</p>
            <p className="text-sm">Les documents apparaîtront ici une fois uploadés</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projectDetails.documents.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {decodeURIComponent(doc.fileName)}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{doc.mimeType}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span>Uploadé le {formatDate(doc.uploadedAt.toString())}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={doc.url}
                        download={doc.fileName}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Télécharger
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Synthèses */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Synthèses IA ({projectDetails.syntheses.length})
        </h2>
        {projectDetails.syntheses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">Aucune synthèse disponible</p>
            <p className="text-sm">Les analyses IA apparaîtront ici une fois générées</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projectDetails.syntheses.map((synthesis) => (
              <div key={synthesis.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-sm text-gray-500">
                    Généré le {formatDate(synthesis.createdAt.toString())}
                  </div>
                  {synthesis.manusConversationUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={synthesis.manusConversationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Conversation ManusAI
                      </a>
                    </Button>
                  )}
                </div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {synthesis.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
}; 