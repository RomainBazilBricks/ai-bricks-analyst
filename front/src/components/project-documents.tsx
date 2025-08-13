import { useState } from 'react';
import { useGetProjectDocuments } from "@/api/projects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  ExternalLink, 
  Download, 
  Calendar,
  HardDrive,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
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

  const {
    data: documents,
    isLoading,
    isError,
    error,
    refetch
  } = useGetProjectDocuments(projectUniqueId, { enabled: !!projectUniqueId });

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
        <CardDescription>
          {documents.length === 1 
            ? "1 document transmis pour ce projet" 
            : `${documents.length} documents transmis pour ce projet`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((document: DocumentResponse) => (
            <div 
              key={document.id} 
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getFileIcon(document.mimeType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 
                        className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                        onClick={() => toggleDocumentDetails(document.id)}
                        title={document.fileName}
                      >
                        {document.fileName}
                      </h4>
                      <Badge variant={getStatusColor(document.status)} className="flex items-center gap-1">
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

                <div className="flex items-center gap-2 ml-4">
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
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions globales */}
        <div className="mt-6 pt-4 border-t flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Total: {formatFileSize(documents.reduce((total, doc) => total + doc.size, 0))}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
