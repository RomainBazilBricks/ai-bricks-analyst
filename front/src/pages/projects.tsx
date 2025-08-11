import { useState } from 'react';
import { useGetAllProjects, useCreateProject } from "@/api/projects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { queryClient } from "@/api/query-config";
import { Eye, FileText, Brain, Calendar } from "lucide-react";
import type { CreateProjectInput } from "@shared/types/projects";

export const ProjectsPage = () => {
  // États locaux pour la création de projet
  const [projectUniqueId, setProjectUniqueId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [fileUrls, setFileUrls] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Hooks de données (React Query)
  const {
    data: projectsData,
    isLoading,
    isError,
    error,
    refetch
  } = useGetAllProjects();

  // Hook de mutation pour créer un projet
  const { mutateAsync: createProject, isPending: isCreating, isError: isCreateError, error: createError } = useCreateProject({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowCreateForm(false);
      setProjectUniqueId('');
      setProjectName('');
      setFileUrls('');
    },
  });

  // Hooks de stores (Zustand)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  // Logique métier
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectUniqueId.trim() || !projectName.trim() || !fileUrls.trim()) return;

    const urlsArray = fileUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urlsArray.length === 0) return;

    const projectData: CreateProjectInput = {
      projectUniqueId: projectUniqueId.trim(),
      projectName: projectName.trim(),
      fileUrls: urlsArray
    };

    try {
      await createProject(projectData);
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Rendu avec composants ShadCN
  return (
    <div className="h-full w-full flex flex-col p-6 gap-6">
      {/* Header avec déconnexion */}
      <div className="w-full flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Projets d'Analyse Immobilière
        </h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            variant={showCreateForm ? "outline" : "default"}
          >
            {showCreateForm ? "Annuler" : "Nouveau Projet"}
          </Button>
          {isAuthenticated && (
            <Button variant="outline" onClick={handleLogout}>
              Se déconnecter
            </Button>
          )}
        </div>
      </div>

      {/* Formulaire de création de projet */}
      {showCreateForm && (
        <div className="w-full max-w-2xl bg-white p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Créer un nouveau projet</h2>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nom du projet
              </label>
              <Input
                type="text"
                placeholder="ex: Immeuble Lyon Centre"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Identifiant unique du projet
              </label>
              <Input
                type="text"
                placeholder="ex: immeuble-lyon-2025"
                value={projectUniqueId}
                onChange={e => setProjectUniqueId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                URLs des fichiers (une par ligne)
              </label>
              <textarea
                className="w-full min-h-32 p-3 border border-gray-300 rounded-md resize-y"
                placeholder={`https://example.com/contrat.pdf
https://example.com/rapport-financier.xlsx
https://example.com/expertise.pdf`}
                value={fileUrls}
                onChange={e => setFileUrls(e.target.value)}
                required
              />
            </div>
            {isCreateError && (
              <Alert variant="destructive">
                <AlertTitle>Erreur lors de la création</AlertTitle>
                <AlertDescription>
                  {(createError as any)?.response?.data?.error || (createError as Error)?.message || 'Erreur inconnue'}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Création en cours...' : 'Créer le projet'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Affichage des erreurs */}
      {isError && (
        <Alert variant="destructive" className="w-full max-w-2xl">
          <AlertTitle>Erreur lors du chargement</AlertTitle>
          <AlertDescription>
            {(error as Error).message}
          </AlertDescription>
        </Alert>
      )}

      {/* Liste des projets */}
      <div className="flex-1 w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Liste des projets ({projectsData?.items?.length || 0})
          </h2>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-6 border rounded-lg">
                <Skeleton className="h-6 w-2/3 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {projectsData?.items?.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl mb-2">Aucun projet trouvé</p>
                <p className="text-sm">Créez votre premier projet pour commencer</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projectsData?.items?.map((project) => (
                  <div 
                    key={project.id} 
                    className="bg-white p-6 border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 cursor-pointer group"
                    onClick={() => navigate(`/projects/${project.projectUniqueId}`)}
                  >
                    {/* Header du projet */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {project.projectName}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        ID: {project.projectUniqueId}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <Calendar className="h-4 w-4" />
                        <span>Créé le {formatDate(project.createdAt.toString())}</span>
                      </div>
                    </div>
                    
                    {/* Statistiques rapides */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm group-hover:bg-blue-100 transition-colors">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-900 font-medium">Documents</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm group-hover:bg-green-100 transition-colors">
                        <Brain className="h-4 w-4 text-green-600" />
                        <span className="text-green-900 font-medium">Synthèses</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-400">
                        ID: {project.id.substring(0, 8)}...
                      </div>
                      <div className="flex items-center gap-2 text-sm text-blue-600 group-hover:text-blue-700 font-medium">
                        <Eye className="h-4 w-4" />
                        Voir détails
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {projectsData?.hasMore && (
          <div className="mt-8 flex justify-center">
            <Button variant="outline" size="lg">
              Charger plus de projets
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}; 