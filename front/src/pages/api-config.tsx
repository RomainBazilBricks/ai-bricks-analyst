import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  useGetActivePythonApiConfig, 
  useUpdatePythonApiConfig,
  useGetAllApiConfigs,
  useCreateApiConfig,

  useDeleteApiConfig
} from '@/api/api-config';
import { queryClient } from '@/api/query-config';

export const ApiConfigPage = () => {
  const [pythonUrl, setPythonUrl] = useState('');
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigUrl, setNewConfigUrl] = useState('');
  const [newConfigDescription, setNewConfigDescription] = useState('');

  // Hooks pour l'API Python
  const { data: pythonConfig, isLoading: pythonLoading, error: pythonError } = useGetActivePythonApiConfig();
  const { mutateAsync: updatePythonConfig, isPending: pythonUpdatePending, error: pythonUpdateError } = useUpdatePythonApiConfig({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-configs"] });
      setPythonUrl('');
    },
  });

  // Hooks pour toutes les configurations
  const { data: allConfigs, isLoading: allConfigsLoading } = useGetAllApiConfigs();
  const { mutateAsync: createConfig, isPending: createPending } = useCreateApiConfig({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-configs"] });
      setNewConfigName('');
      setNewConfigUrl('');
      setNewConfigDescription('');
    },
  });

  const { mutateAsync: deleteConfig } = useDeleteApiConfig(0, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-configs"] });
    },
  });

  // Initialiser l'URL Python si elle n'est pas déjà définie
  React.useEffect(() => {
    if (pythonConfig && !pythonUrl) {
      setPythonUrl(pythonConfig.url);
    }
  }, [pythonConfig, pythonUrl]);

  const handleUpdatePythonUrl = async () => {
    if (!pythonUrl.trim()) return;

    try {
      await updatePythonConfig({
        url: pythonUrl.trim(),
        isActive: true
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const handleCreateConfig = async () => {
    if (!newConfigName.trim() || !newConfigUrl.trim()) return;

    try {
      await createConfig({
        name: newConfigName.trim(),
        url: newConfigUrl.trim(),
        description: newConfigDescription.trim() || undefined,
        isActive: true
      });
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    }
  };

  const handleDeleteConfig = async (_configId: number) => {
    try {
      await deleteConfig(undefined);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuration des APIs</h1>
        <p className="text-gray-600 mt-2">
          Gérez les URLs des APIs externes utilisées par l'application
        </p>
      </div>

      {/* Configuration API Python */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API Python
            {pythonConfig?.isActive && <Badge variant="default">Active</Badge>}
          </CardTitle>
          <CardDescription>
            Configuration de l'API Python pour l'envoi de messages (endpoints /send-message-quick, /send-message, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pythonError && (
            <Alert variant="destructive">
              Erreur lors du chargement de la configuration Python
            </Alert>
          )}

          {pythonUpdateError ? (
            <Alert variant="destructive">
              Erreur lors de la mise à jour: {(pythonUpdateError as any)?.message || 'Erreur inconnue'}
            </Alert>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">URL actuelle:</label>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              {pythonLoading ? 'Chargement...' : pythonConfig?.url || 'Aucune configuration'}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="pythonUrl" className="text-sm font-medium">
              Nouvelle URL:
            </label>
            <Input
              id="pythonUrl"
              type="url"
              placeholder="http://localhost:8000"
              value={pythonUrl}
              onChange={(e) => setPythonUrl(e.target.value)}
              disabled={pythonUpdatePending}
            />
          </div>

          <Button 
            onClick={handleUpdatePythonUrl}
            disabled={pythonUpdatePending || !pythonUrl.trim()}
            className="w-full sm:w-auto"
          >
            {pythonUpdatePending ? 'Mise à jour...' : 'Mettre à jour l\'URL Python'}
          </Button>
        </CardContent>
      </Card>

      {/* Créer une nouvelle configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle Configuration API</CardTitle>
          <CardDescription>
            Ajouter une nouvelle configuration d'API externe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="newConfigName" className="text-sm font-medium">
                Nom:
              </label>
              <Input
                id="newConfigName"
                placeholder="ex: API Python Dev"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                disabled={createPending}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newConfigUrl" className="text-sm font-medium">
                URL:
              </label>
              <Input
                id="newConfigUrl"
                type="url"
                placeholder="http://localhost:8000"
                value={newConfigUrl}
                onChange={(e) => setNewConfigUrl(e.target.value)}
                disabled={createPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="newConfigDescription" className="text-sm font-medium">
              Description (optionnel):
            </label>
            <Input
              id="newConfigDescription"
              placeholder="Description de cette configuration..."
              value={newConfigDescription}
              onChange={(e) => setNewConfigDescription(e.target.value)}
              disabled={createPending}
            />
          </div>

          <Button 
            onClick={handleCreateConfig}
            disabled={createPending || !newConfigName.trim() || !newConfigUrl.trim()}
            className="w-full sm:w-auto"
          >
            {createPending ? 'Création...' : 'Créer la configuration'}
          </Button>
        </CardContent>
      </Card>

      {/* Liste des configurations existantes */}
      <Card>
        <CardHeader>
          <CardTitle>Configurations Existantes</CardTitle>
          <CardDescription>
            Toutes les configurations d'API enregistrées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allConfigsLoading ? (
            <p className="text-gray-600">Chargement des configurations...</p>
          ) : allConfigs?.items && allConfigs.items.length > 0 ? (
            <div className="space-y-4">
              {allConfigs.items.map((config) => (
                <div key={config.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{config.name}</h3>
                    <div className="flex items-center gap-2">
                      {config.isActive && <Badge variant="default">Active</Badge>}
                      {config.name !== 'Python API' && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteConfig(config.id)}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{config.url}</p>
                  {config.description && (
                    <p className="text-sm text-gray-500">{config.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Créé le {new Date(config.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Aucune configuration trouvée.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
