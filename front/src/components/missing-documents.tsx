
import { useState } from "react";
import { useGetMissingDocuments, useUpdateMissingDocumentStatus, type MissingDocument } from "@/api/missing-documents";
import { useRetryStep } from "@/api/external-tools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileX, 
  AlertTriangle,
  CheckCircle,

  XCircle,
  Check,
  X,
  RefreshCw, // ✅ Nouveau icône pour le bouton Relancer

} from "lucide-react";
import { queryClient } from "@/api/query-config";

interface MissingDocumentsProps {
  projectUniqueId: string;
}

const DocumentRow = ({ doc, projectUniqueId }: { 
  doc: MissingDocument; 
  projectUniqueId: string; 
}) => {
  const [showCommentField, setShowCommentField] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'resolved' | 'irrelevant' | null>(null);
  const [comment, setComment] = useState('');

  const { mutateAsync: updateStatus, isPending } = useUpdateMissingDocumentStatus({
    onSuccess: () => {
      console.log('✅ Mutation success!');
      queryClient.invalidateQueries({ queryKey: ["missing-documents", projectUniqueId] });
      setShowCommentField(false);
      setSelectedStatus(null);
      setComment('');
    },
    onError: (error: any) => {
      console.error('❌ Mutation error:', error);
    }
  });

  const handleStatusClick = (status: 'resolved' | 'irrelevant') => {
    setSelectedStatus(status);
    setShowCommentField(true);
    // Pré-remplir le commentaire
    const defaultComment = status === 'resolved' 
      ? 'Document fourni ou résolu' 
      : 'Document non nécessaire pour ce projet';
    setComment(defaultComment);
  };

  const handleConfirm = async () => {
    if (selectedStatus) {
      try {
        console.log('🚀 Starting mutation:', { projectUniqueId, documentId: doc.id, status: selectedStatus, whyStatus: comment.trim() });
        await updateStatus({
          projectUniqueId,
          documentId: doc.id,
          status: selectedStatus,
          whyStatus: comment.trim() || undefined
        });
        console.log('🎉 Mutation completed successfully!');
      } catch (error) {
        console.error('💥 Error in handleConfirm:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowCommentField(false);
    setSelectedStatus(null);
    setComment('');
  };

  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <h4 className="font-medium text-gray-900 text-base mb-1">{doc.name}</h4>
          {doc.whyMissing && (
            <p className="text-sm text-gray-600 mb-2">{doc.whyMissing}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {!showCommentField ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusClick('irrelevant')}
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Marquer comme non pertinent"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusClick('resolved')}
                className="h-7 w-7 p-0 text-gray-400 hover:text-green-600 hover:bg-green-50"
                title="Marquer comme résolu"
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Commentaire de résolution"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isPending}
                className={`h-8 px-3 text-sm text-white ${
                  selectedStatus === 'resolved' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {isPending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="h-8 px-3 text-sm border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const MissingDocuments = ({ projectUniqueId }: MissingDocumentsProps) => {
  const { data: missingDocuments, isLoading, isError } = useGetMissingDocuments(projectUniqueId);
  const [showResolved, setShowResolved] = useState(false);
  const [showIrrelevant, setShowIrrelevant] = useState(false);
  
  // ✅ Hook pour relancer l'étape 3 (Documents manquants)
  const { mutateAsync: retryStep, isPending: isRetrying } = useRetryStep(projectUniqueId, 3, {
    onSuccess: () => {
      console.log('✅ Étape 3 relancée avec succès en mode debug');
      // Invalider les caches pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["missing-documents", projectUniqueId] });
    },
    onError: (error) => {
      console.error('❌ Erreur lors du relancement de l\'étape 3:', error);
    }
  });

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <FileX className="h-4 w-4 text-orange-600" />
            Documents manquants
          </CardTitle>
          <CardDescription>Chargement des documents...</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 border rounded-md">
                <div className="flex items-start justify-between mb-2">
                  <Skeleton className="h-4 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
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
            <FileX className="h-4 w-4 text-orange-600" />
            Documents manquants
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des documents manquants.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!missingDocuments || missingDocuments.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <FileX className="h-4 w-4 text-orange-600" />
            Documents manquants
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun document manquant identifié pour ce projet. Les données seront disponibles après l'étape 3 du workflow.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Grouper par statut
  const pendingDocs = missingDocuments.filter(doc => doc.status === 'pending');
  const resolvedDocs = missingDocuments.filter(doc => doc.status === 'resolved');
  const irrelevantDocs = missingDocuments.filter(doc => doc.status === 'irrelevant');

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <FileX className="h-5 w-5 text-blue-600" />
            Documents manquants
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800">
                {pendingDocs.length} en attente
              </Badge>
              {resolvedDocs.length > 0 && (
                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                  {resolvedDocs.length} résolus
                </Badge>
              )}
              {irrelevantDocs.length > 0 && (
                <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600">
                  {irrelevantDocs.length} non pertinents
                </Badge>
              )}
            </div>
            {/* ✅ Bouton Relancer - Version discrète */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => retryStep()}
              disabled={isRetrying}
              className="flex items-center gap-1 h-7 px-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 opacity-60 hover:opacity-100 transition-all"
              title="Relancer l'analyse des documents manquants"
            >
              <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isRetrying ? 'Relance...' : 'Relancer'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-0">
          {/* Documents en attente */}
          {pendingDocs.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} projectUniqueId={projectUniqueId} />
          ))}
          
          {pendingDocs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Tous les documents ont été traités</p>
            </div>
          )}

          {/* Section Documents Résolus */}
          {resolvedDocs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className="flex items-center justify-between w-full p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">
                    Documents résolus ({resolvedDocs.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600">
                    {showResolved ? 'Masquer' : 'Afficher'}
                  </span>
                  <div className={`transform transition-transform ${showResolved ? 'rotate-180' : ''}`}>
                    ⌄
                  </div>
                </div>
              </button>
              
              {showResolved && (
                <div className="mt-2 space-y-2">
                  {resolvedDocs.map((doc) => (
                    <div key={doc.id} className="py-3 px-4 bg-green-50/50 rounded-md border border-green-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <h4 className="font-medium text-gray-900 text-sm">{doc.name}</h4>
                          </div>
                          {doc.whyStatus && (
                            <p className="text-xs text-green-700 bg-green-100 rounded px-2 py-1 inline-block">
                              {doc.whyStatus}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-100 border-green-200 text-green-700">
                          Résolu
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section Documents Non Pertinents */}
          {irrelevantDocs.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowIrrelevant(!showIrrelevant)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">
                    Documents non pertinents ({irrelevantDocs.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {showIrrelevant ? 'Masquer' : 'Afficher'}
                  </span>
                  <div className={`transform transition-transform ${showIrrelevant ? 'rotate-180' : ''}`}>
                    ⌄
                  </div>
                </div>
              </button>
              
              {showIrrelevant && (
                <div className="mt-2 space-y-2">
                  {irrelevantDocs.map((doc) => (
                    <div key={doc.id} className="py-3 px-4 bg-gray-50/50 rounded-md border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-gray-500" />
                            <h4 className="font-medium text-gray-600 text-sm line-through">{doc.name}</h4>
                          </div>
                          {doc.whyStatus && (
                            <p className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 inline-block">
                              {doc.whyStatus}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-gray-100 border-gray-200 text-gray-600">
                          Non pertinent
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
