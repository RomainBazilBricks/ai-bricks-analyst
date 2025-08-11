import { useGetAllUsers } from "@/api/users";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export const HomePage = () => {
  /* Récupération de la liste des utilisateurs */
  const {
    data: users,
    isLoading,
    isError: isUsersError,
    error: usersError,
  } = useGetAllUsers();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header de bienvenue */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Bienvenue sur AI Bricks Analyst
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Votre plateforme d'analyse de projets avec intelligence artificielle
        </p>
        
        {/* Actions rapides */}
        <div className="flex flex-wrap justify-center gap-4">
          {isAuthenticated && (
            <Button onClick={() => navigate('/projects')} size="lg">
              Voir mes Projets
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/api')} size="lg">
            Documentation API
          </Button>
          {isAuthenticated && (
            <Button variant="outline" onClick={() => navigate('/prompts')} size="lg">
              Gérer les Prompts
            </Button>
          )}
        </div>
      </div>

      {/* Section utilisateurs (pour debug/admin) */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Utilisateurs du système
        </h2>
        
        {/* Affichage des erreurs */}
        {isUsersError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Erreur lors du chargement</AlertTitle>
            <AlertDescription>
              {(usersError as Error).message}
            </AlertDescription>
          </Alert>
        )}

        {/* Affichage de la liste */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {users?.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{u.name}</div>
                  <div className="text-sm text-gray-500">{u.email}</div>
                </div>
                <div className="text-xs text-gray-400">
                  ID: {u.id}
                </div>
              </div>
            ))}
            {(!users || users.length === 0) && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};