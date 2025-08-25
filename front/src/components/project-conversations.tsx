import React, { useState } from "react";
import { useGetProjectConversations, useCreateDraft, type ConversationMessage } from "@/api/conversations";
import { useRetryStep } from "@/api/external-tools";
import { useRetryReformulation } from "@/api/reformulation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RichEditor } from "@/components/ui/rich-editor";
import { marked } from 'marked';
import { 
  MessageSquare,
  Send,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Eye

} from "lucide-react";
import { queryClient } from "@/api/query-config";

interface ProjectConversationsProps {
  projectUniqueId: string;
  latestConversationUrl?: string; // ✅ Ajouter le conversationUrl
}

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ConversationHistory = ({ conversations }: { conversations: ConversationMessage[] }) => {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Grouper les conversations par date de session
  const groupedConversations = conversations.reduce((groups, conv) => {
    const dateKey = formatDate(conv.sessionDate);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(conv);
    return groups;
  }, {} as Record<string, ConversationMessage[]>);

  const toggleSession = (dateKey: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedSessions(newExpanded);
  };

  const copyMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      // TODO: Add toast notification
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <div className="space-y-3">
      {Object.entries(groupedConversations).map(([dateKey, messages]) => {
        const isExpanded = expandedSessions.has(dateKey);
        // const latestMessage = messages[0]; // Plus récent en premier

        return (
          <div key={dateKey} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSession(dateKey)}
              className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">Session du {dateKey}</span>
                {!isExpanded && (
                  <span className="text-sm text-gray-500">
                    {messages.length} message{messages.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {isExpanded && (
              <div className="p-4 bg-white space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="border-l-4 border-blue-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-900 text-sm">{message.sender}</span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyMessage(message.message)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                                <div 
              className="text-sm prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-6 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(message.message) }}
            />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Convertir Markdown en HTML avec marked
const markdownToHtml = (markdown: string) => {
    return marked(markdown);
};

const MessageDraft = ({ projectUniqueId, conversations }: { projectUniqueId: string; conversations?: ConversationMessage[] }) => {
  // Récupérer le message reformulé et le message original
  const reformulatedMessage = conversations?.find(conv => 
    conv.sender === 'IA_REFORMULATED'
  );
  const originalMessage = conversations?.find(conv => 
    conv.sender === 'IA'
  );

  // Utiliser le message reformulé en priorité, sinon le message original
  const latestDraft = reformulatedMessage || originalMessage;
  
  const [draftMessage, setDraftMessage] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Mettre à jour le draft quand les conversations changent ou quand on bascule entre original/reformulé
  React.useEffect(() => {
    const messageToShow = showOriginal ? originalMessage : latestDraft;
    if (messageToShow && (!hasInitialized || showOriginal !== undefined)) {
      const htmlContent = markdownToHtml(messageToShow.message);
      if (typeof htmlContent === 'string') {
        setDraftMessage(htmlContent);
      } else {
        htmlContent.then((html) => setDraftMessage(html));
      }
      if (!hasInitialized) setHasInitialized(true);
    }
  }, [latestDraft, originalMessage, showOriginal, hasInitialized]);





  const { mutateAsync: createDraft, isPending } = useCreateDraft(projectUniqueId, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", projectUniqueId] });
      setDraftMessage('');
    }
  });



  const handleSendDraft = async () => {
    if (draftMessage.trim()) {
      await createDraft({
        message: draftMessage.trim(),
        sender: 'L\'équipe d\'analyse'
      });
    }
  };

  return (
    <div className="space-y-4">

      {/* Éditeur riche moderne */}
      <RichEditor
        content={draftMessage}
        onChange={setDraftMessage}
        placeholder="Rédigez votre message au porteur de projet..."
        className="mb-4"
      />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Bouton discret pour voir le message original */}
          {reformulatedMessage && originalMessage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowOriginal(!showOriginal)}
              className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 opacity-60 hover:opacity-100 transition-all"
              title={showOriginal ? "Voir la version reformulée" : "Voir le message original"}
            >
              <Eye className="h-3 w-3 mr-1" />
              {showOriginal ? "Version reformulée" : "Message original"}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs">
            Copier
          </Button>
          <Button 
            onClick={handleSendDraft}
            disabled={!draftMessage.trim() || isPending}
            className="h-8 text-xs"
          >
            {isPending ? (
              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-1" />
            ) : (
              <Send className="h-3 w-3 mr-1" />
            )}
            Envoyer et clôturer la session
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ProjectConversations = ({ projectUniqueId, latestConversationUrl }: ProjectConversationsProps) => {
  const { data: conversations, isLoading, isError } = useGetProjectConversations(projectUniqueId);
  
  // ✅ Hook pour relancer l'étape 5 (Rédaction d'un message)
  const { mutateAsync: retryStep, isPending: isRetrying } = useRetryStep(
    projectUniqueId, 
    5, 
    latestConversationUrl, // ✅ Réutiliser le conversationUrl comme le bouton Play
    {
      onSuccess: () => {
        console.log('✅ Étape 5 relancée avec succès en mode debug');
        // Invalider les caches pour rafraîchir les données
        queryClient.invalidateQueries({ queryKey: ["conversations", projectUniqueId] });
      },
      onError: (error) => {
        console.error('❌ Erreur lors du relancement de l\'étape 5:', error);
      }
    }
  );

  // ✅ Hook pour relancer la reformulation GPT-4o
  const { mutateAsync: retryReformulation, isPending: isRetryingReformulation } = useRetryReformulation(
    projectUniqueId,
    {
      onSuccess: () => {
        console.log('✅ Reformulation GPT-4o relancée avec succès');
        // Invalider les caches pour rafraîchir les données
        queryClient.invalidateQueries({ queryKey: ["conversations", projectUniqueId] });
      },
      onError: (error: any) => {
        console.error('❌ Erreur lors du relancement de la reformulation:', error);
      }
    }
  );

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Historique des conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Historique des conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert>
            <AlertDescription>
              Erreur lors du chargement des conversations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Historique des conversations
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-6">
        {/* Historique des conversations */}
        {conversations && conversations.length > 0 && (
          <div>
            <ConversationHistory conversations={conversations} />
          </div>
        )}

        {/* Nouveau message */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-medium text-gray-900">Nouveau message</h3>
              {/* ✅ Bouton Relancer - Version discrète */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => retryStep()}
                disabled={isRetrying}
                className="flex items-center gap-1 h-7 px-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 opacity-60 hover:opacity-100 transition-all"
                title="Relancer la génération du message IA"
              >
                <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isRetrying ? 'Relance...' : 'Relancer'}</span>
              </Button>
              {/* ✅ Bouton Relancer la reformulation - Version discrète */}
              {conversations?.some(conv => conv.sender === 'IA') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => retryReformulation(undefined)}
                  disabled={isRetryingReformulation}
                  className="flex items-center gap-1 h-7 px-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 opacity-60 hover:opacity-100 transition-all"
                  title="Relancer la reformulation GPT-4o"
                >
                  <RefreshCw className={`h-3 w-3 ${isRetryingReformulation ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">{isRetryingReformulation ? 'Reformule...' : 'Relancer reformulation'}</span>
                </Button>
              )}
            </div>
            {conversations?.some(conv => conv.sender === 'IA') && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                <MessageSquare className="h-3 w-3" />
                Draft généré par l'IA disponible
              </div>
            )}
          </div>
          <MessageDraft projectUniqueId={projectUniqueId} conversations={conversations} />
        </div>
      </CardContent>
    </Card>
  );
};
