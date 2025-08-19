import { useState } from 'react';
import { useGetProjectDocuments, useDeleteDocument, useDeleteAllDocuments, useGetProjectById } from "@/api/projects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/api/query-config";
import { 
  FileText, 
  ExternalLink, 
  Download, 
  Calendar,
  HardDrive,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Package
} from "lucide-react";
import type { DocumentResponse } from "@shared/types/projects";

interface ProjectDocumentsProps {
  projectUniqueId: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string | Date): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('image')) return <FileText className="h-5 w-5 text-green-500" />;
  if (mimeType.includes('document') || mimeType.includes('word')) return <FileText className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileText className="h-5 w-5 text-green-600" />;
  return <FileText className="h-5 w-5 text-gray-500" />;
};

const getStatusIcon = (status: string) => {
  if (!status) return <Clock className="h-4 w-4 text-gray-500" />;
  
  switch (status.toLowerCase()) {
    case 'uploaded':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'processed':
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (!status) return 'outline';
  
  switch (status.toLowerCase()) {
    case 'uploaded':
      return 'default';
    case 'processed':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusText = (status: string): string => {
  if (!status) return 'Inconnu';
  
  switch (status.toLowerCase()) {
    case 'uploaded':
      return 'Téléchargé';
    case 'processed':
      return 'Traité';
    case 'error':
      return 'Erreur';
    default:
      return status;
  }
};

export const ProjectDocuments: React.FC<ProjectDocumentsProps> = ({ projectUniqueId }) => {
  const [expandedDocument, setExpandedDocument] = useState<string | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const {
    data: documents,
    isLoading,
    isError,
    error,
    refetch
  } = useGetProjectDocuments(projectUniqueId, { enabled: !!projectUniqueId });

  // Récupérer les informations du projet pour avoir accès au zipUrl
  const {
    data: project,
    isLoading: isProjectLoading
  } = useGetProjectById(projectUniqueId, { enabled: !!projectUniqueId });

  const handleOpenDocument = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadDocument = (url: string, fileName: string) => {
    // Créer un lien temporaire pour télécharger le fichier
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleDocumentDetails = (documentId: string) => {
    setExpandedDocument(expandedDocument === documentId ? null : documentId);
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocumentToDelete(documentId);
  };

  // Hook de suppression de document
  const { mutateAsync: deleteDocument, isPending: isDeleting } = useDeleteDocument(projectUniqueId, documentToDelete || '', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectUniqueId, "documents"] });
      setDocumentToDelete(null);
    },
    onError: (error: any) => {
      console.error('Erreur lors de la suppression:', error);
      // Ici on pourrait ajouter un toast d'erreur
    }
  });

  // Hook de suppression de tous les documents
  const { mutateAsync: deleteAllDocuments, isPending: isDeletingAll } = useDeleteAllDocuments(projectUniqueId, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", projectUniqueId, "documents"] });
      setShowDeleteAllConfirm(false);
    },
    onError: (error: any) => {
      console.error('Erreur lors de la suppression de tous les documents:', error);
    }
  });

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      await deleteDocument(undefined);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const cancelDeleteDocument = () => {
    setDocumentToDelete(null);
  };

  const confirmDeleteAllDocuments = async () => {
    try {
      await deleteAllDocuments(undefined);
    } catch (error) {
      console.error('Erreur lors de la suppression de tous les documents:', error);
    }
  };

  const cancelDeleteAllDocuments = () => {
    setShowDeleteAllConfirm(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents du projet
          </CardTitle>
          <CardDescription>
            Chargement des documents...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents du projet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur de chargement</AlertTitle>
            <AlertDescription>
              {error?.message || 'Impossible de charger les documents du projet.'}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents du projet
          </CardTitle>
          <CardDescription>
            Aucun document n'a encore été ajouté à ce projet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun document disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents du projet
          <Badge variant="secondary" className="ml-auto">
            {documents.length}
          </Badge>
        </CardTitle>
        {documents.length > 0 && (
          <div className="flex justify-end mt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteAllConfirm(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer tous les documents
            </Button>
          </div>
        )}

      </CardHeader>
      <CardContent>
        {/* Section ZIP si disponible */}
        {project?.zipUrl && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-1">
                    Archive complète des documents
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Fichier ZIP contenant tous les documents du projet, généré automatiquement lors de l'analyse.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDocument(project.zipUrl!)}
                      className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ouvrir le ZIP
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadDocument(project.zipUrl!, `${project.projectName}-documents.zip`)}
                      className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Download className="h-3 w-3" />
                      Télécharger le ZIP
                    </Button>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Archive
              </Badge>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {documents.map((document: DocumentResponse) => (
            <div 
              key={document.id} 
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {getFileIcon(document.mimeType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 
                        className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 flex-1 min-w-0"
                        onClick={() => toggleDocumentDetails(document.id)}
                        title={document.fileName}
                      >
                        {document.fileName}
                      </h4>
                      <Badge variant={getStatusColor(document.status)} className="flex items-center gap-1 flex-shrink-0">
                        {getStatusIcon(document.status)}
                        {getStatusText(document.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(document.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(document.uploadedAt)}
                      </span>
                    </div>

                    {/* Détails étendus */}
                    {expandedDocument === document.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium">Type MIME:</span> {document.mimeType}
                          </div>
                          <div>
                            <span className="font-medium">Hash:</span> 
                            <code className="ml-1 text-xs bg-gray-200 px-1 rounded">
                              {document.hash.substring(0, 16)}...
                            </code>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDocument(document.url)}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ouvrir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(document.url, document.fileName)}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Télécharger
                  </Button>
                  {documentToDelete === document.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={confirmDeleteDocument}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0"
                      >
                        {isDeleting ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelDeleteDocument}
                        disabled={isDeleting}
                        className="h-8 px-2 text-xs"
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDocument(document.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de confirmation pour supprimer tous les documents */}
        {showDeleteAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Confirmer la suppression
              </h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer <strong>tous les documents</strong> de ce projet ? Cette action est irréversible.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={cancelDeleteAllDocuments}
                  disabled={isDeletingAll}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteAllDocuments}
                  disabled={isDeletingAll}
                  className="flex items-center gap-2"
                >
                  {isDeletingAll ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Supprimer tout
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
