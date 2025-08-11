import { useState } from 'react';
import { queryClient } from "@/api/query-config";
import { useAuthStore } from "@/stores/auth";
import { 
  useGetPaginatedAiCredentials, 
  useCreateAiCredential, 
  useUpdateAiCredential,
  useDeleteAiCredential 
} from "@/api/ai-credentials";
import type { 
  AiCredential, 
  CreateAiCredentialInput, 
  AiPlatform,
  AiCredentialResponse,
  UpdateAiCredentialInput
} from '@shared/types/ai-credentials';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PLATFORMS: AiPlatform[] = ['chatgpt', 'claude', 'manus', 'perplexity', 'gemini', 'mistral'];

export const AiCredentialsPage = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<AiCredential | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<AiPlatform | 'all'>('all');
  const [activeOnly, setActiveOnly] = useState(true);

  // Vérification de l'authentification
  const { isAuthenticated } = useAuthStore();

  // Hooks pour les données - uniquement si authentifié
  const { data, isLoading, isError, error } = useGetPaginatedAiCredentials({
    platform: selectedPlatform === 'all' ? undefined : selectedPlatform,
    isActive: activeOnly,
    limit: 20
  }, {
    enabled: isAuthenticated // N'exécuter la requête que si authentifié
  });

  const { mutateAsync: createCredential, isPending: isCreating } = useCreateAiCredential({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-credentials"] });
      setShowCreateForm(false);
    }
  });

  const { mutateAsync: updateCredential, isPending: isUpdating } = useUpdateAiCredential(
    editingCredential?.id || 0,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["ai-credentials"] });
        setEditingCredential(null);
      }
    }
  );

  const { mutateAsync: deleteCredential, isPending: isDeleting } = useDeleteAiCredential(0, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-credentials"] });
    }
  });

  const handleDelete = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir désactiver ce credential ?')) {
      await deleteCredential(undefined);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformColor = (platform: AiPlatform) => {
    const colors = {
      chatgpt: 'bg-green-100 text-green-800',
      claude: 'bg-purple-100 text-purple-800',
      manus: 'bg-blue-100 text-blue-800',
      perplexity: 'bg-orange-100 text-orange-800',
      gemini: 'bg-red-100 text-red-800',
      mistral: 'bg-gray-100 text-gray-800'
    };
    return colors[platform] || 'bg-gray-100 text-gray-800';
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Vous devez être connecté pour accéder à cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Chargement des credentials...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Erreur lors du chargement des credentials: {error?.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Credentials IA</h1>
          <p className="text-muted-foreground">
            Gérez les credentials d'authentification pour les différentes plateformes IA
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          Ajouter un Credential
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={selectedPlatform} onValueChange={(value: string) => setSelectedPlatform(value as AiPlatform | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les plateformes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les plateformes</SelectItem>
              {PLATFORMS.map(platform => (
                <SelectItem key={platform} value={platform}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant={activeOnly ? "default" : "outline"} 
            onClick={() => setActiveOnly(!activeOnly)}
          >
            {activeOnly ? "Actifs uniquement" : "Tous"}
          </Button>
        </CardContent>
      </Card>

      {/* Documentation d'extraction */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Guide d'extraction des credentials
            </CardTitle>
            <CardDescription>
              Suivez ces étapes pour extraire automatiquement vos credentials depuis votre navigateur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
              <h4 className="font-semibold text-blue-900 mb-2">📝 Étapes à suivre :</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Connectez-vous sur la plateforme IA (ex: https://www.manus.ai)</li>
                <li>Ouvrez la console développeur (F12 → onglet Console)</li>
                <li>Copiez et collez le script ci-dessous</li>
                <li>Appuyez sur Entrée pour exécuter</li>
                <li>Les données seront automatiquement copiées dans votre presse-papier</li>
                <li>Collez les données dans le champ "Données de session" ci-dessous</li>
              </ol>
            </div>
            
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-green-400 text-sm font-mono">Script d'extraction Manus.ai</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const script = `// Script d'extraction des credentials Manus.ai
// À exécuter dans la console de https://www.manus.ai

console.log("🔍 EXTRACTION DES CREDENTIALS MANUS.AI");
console.log("=" .repeat(50));

// Fonction utilitaire pour formater JSON
function formatJSON(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return obj;
    }
}

// 1. Extraction des cookies
console.log("\\n🍪 COOKIES:");
const cookies = {};
document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
        cookies[name] = value;
    }
});
console.log(formatJSON(cookies));

// 2. Extraction du localStorage
console.log("\\n💾 LOCAL STORAGE:");
const localStorage_data = {};
Object.keys(localStorage).forEach(key => {
    localStorage_data[key] = localStorage.getItem(key);
});
console.log(formatJSON(localStorage_data));

// 3. Extraction du sessionStorage
console.log("\\n🔄 SESSION STORAGE:");
const sessionStorage_data = {};
Object.keys(sessionStorage).forEach(key => {
    sessionStorage_data[key] = sessionStorage.getItem(key);
});
console.log(formatJSON(sessionStorage_data));

// 4. Informations utilisateur (si disponible)
console.log("\\n👤 USER INFO:");
let userInfo = null;
try {
    if (localStorage_data['UserService.userInfo']) {
        userInfo = JSON.parse(localStorage_data['UserService.userInfo']);
        console.log("User ID:", userInfo.userId);
        console.log("Email:", userInfo.email);
        console.log("Display Name:", userInfo.displayname);
    }
} catch (e) {
    console.log("Impossible de parser UserService.userInfo");
}

// 5. Token de session principal
console.log("\\n🔑 TOKENS PRINCIPAUX:");
console.log("Session ID:", cookies.session_id || "Non trouvé");

// 6. Headers actuels de la page
console.log("\\n📋 HEADERS INFO:");
console.log("User Agent:", navigator.userAgent);
console.log("URL actuelle:", window.location.href);
console.log("Domaine:", window.location.hostname);

// 7. Format JSON complet pour l'API
console.log("\\n🎯 FORMAT JSON POUR API:");
const credentialData = {
    platform: "manus",
    userIdentifier: userInfo?.email || "unknown",
    credentialName: "default",
    sessionData: {
        session_token: cookies.session_id,
        user_id: userInfo?.userId,
        cookies: cookies,
        local_storage: localStorage_data,
        session_storage: sessionStorage_data,
        user_info: userInfo,
        user_agent: navigator.userAgent,
        extracted_at: new Date().toISOString()
    },
    expiresAt: null, // À définir selon la durée de vie de la session
    notes: "Extracted from browser console on " + new Date().toLocaleDateString('fr-FR')
};

console.log(formatJSON(credentialData));

// 8. Instructions de copie
console.log("\\n📋 INSTRUCTIONS:");
console.log("1. Copiez le JSON 'sessionData' ci-dessus");
console.log("2. Utilisez-le dans votre API de credentials");
console.log("3. La session devrait être valide ~30 jours");

// 9. Retourner les données pour manipulation programmatique
window.manusCredentials = credentialData;
console.log("\\n✅ Données sauvegardées dans window.manusCredentials");
console.log("Vous pouvez y accéder avec: copy(window.manusCredentials.sessionData)");

// 10. Copier automatiquement dans le presse-papier (si supporté)
if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(credentialData.sessionData, null, 2))
        .then(() => console.log("📋 SessionData copiées automatiquement dans le presse-papier!"))
        .catch(() => console.log("❌ Impossible de copier automatiquement"));
} else {
    console.log("📋 Copiez manuellement le JSON sessionData ci-dessus");
}`;
                    
                    navigator.clipboard.writeText(script).then(() => {
                      alert('Script copié dans le presse-papier !');
                    });
                  }}
                >
                  📋 Copier le script
                </Button>
              </div>
              <pre className="text-green-400 text-xs overflow-x-auto whitespace-pre-wrap">
{`// Script d'extraction des credentials Manus.ai
// À exécuter dans la console de https://www.manus.ai

console.log("🔍 EXTRACTION DES CREDENTIALS MANUS.AI");
console.log("=".repeat(50));

// ... (Cliquez sur "Copier le script" pour le script complet)

// Le script extrait automatiquement :
// - 🍪 Cookies (session_id, tokens)
// - 💾 LocalStorage (UserService.userInfo, etc.)
// - 🔄 SessionStorage 
// - 👤 Informations utilisateur
// - 🔑 Tokens de session
// - 📋 Headers et User Agent

// ✅ Résultat copié automatiquement dans le presse-papier`}
              </pre>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
              <h4 className="font-semibold text-amber-900 mb-2">⚠️ Sécurité :</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
                <li>Ces données sont sensibles - ne les partagez jamais</li>
                <li>Utilisez uniquement sur vos propres comptes</li>
                <li>Les sessions peuvent expirer (généralement 30 jours)</li>
                <li>Respectez les conditions d'utilisation des plateformes</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
              <h4 className="font-semibold text-green-900 mb-2">💡 Astuce :</h4>
              <p className="text-sm text-green-800">
                Une fois le script exécuté, les données de session seront automatiquement copiées. 
                Il vous suffit de les coller dans le champ "Données de session" ci-dessous.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire de création */}
      {showCreateForm && (
        <CreateCredentialForm 
          onSubmit={createCredential}
          onCancel={() => setShowCreateForm(false)}
          isLoading={isCreating}
        />
      )}

      {/* Formulaire d'édition */}
      {editingCredential && (
        <EditCredentialForm 
          credential={editingCredential}
          onSubmit={updateCredential}
          onCancel={() => setEditingCredential(null)}
          isLoading={isUpdating}
        />
      )}

      {/* Liste des credentials */}
      <div className="grid gap-4">
        {data?.items?.map((credential) => (
          <Card key={credential.id} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <Badge className={getPlatformColor(credential.platform)}>
                  {credential.platform.toUpperCase()}
                </Badge>
                <div>
                  <CardTitle className="text-lg">{credential.credentialName}</CardTitle>
                  {credential.userIdentifier && (
                    <CardDescription>{credential.userIdentifier}</CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={credential.isActive ? "default" : "secondary"}>
                  {credential.isActive ? "Actif" : "Inactif"}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingCredential(credential)}
                >
                  Modifier
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(credential.id)}
                  disabled={isDeleting}
                >
                  Désactiver
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong>Créé le:</strong><br />
                  {formatDate(credential.createdAt)}
                </div>
                <div>
                  <strong>Modifié le:</strong><br />
                  {formatDate(credential.updatedAt)}
                </div>
                <div>
                  <strong>Dernière utilisation:</strong><br />
                  {formatDate(credential.lastUsedAt)}
                </div>
                <div>
                  <strong>Expire le:</strong><br />
                  {formatDate(credential.expiresAt)}
                </div>
              </div>
              {credential.notes && (
                <div className="mt-3 p-3 bg-gray-50 rounded">
                  <strong>Notes:</strong> {credential.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data?.items?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Aucun credential trouvé avec les filtres actuels.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Composant pour créer un credential
const CreateCredentialForm = ({ 
  onSubmit, 
  onCancel, 
  isLoading 
}: { 
  onSubmit: (data: CreateAiCredentialInput) => Promise<AiCredentialResponse>;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState<CreateAiCredentialInput>({
    platform: 'manus',
    credentialName: 'default',
    sessionData: {},
    userAgent: navigator.userAgent // User Agent automatique
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un nouveau credential</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Plateforme</label>
              <Select 
                value={formData.platform} 
                onValueChange={(value: string) => setFormData({...formData, platform: value as AiPlatform})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(platform => (
                    <SelectItem key={platform} value={platform}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Nom du credential</label>
              <Input 
                value={formData.credentialName}
                onChange={(e) => setFormData({...formData, credentialName: e.target.value})}
                placeholder="default"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Identifiant utilisateur</label>
            <Input 
              value={formData.userIdentifier || ''}
              onChange={(e) => setFormData({...formData, userIdentifier: e.target.value})}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Données de session (JSON)</label>
            <Textarea 
              value={JSON.stringify(formData.sessionData, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({...formData, sessionData: parsed});
                } catch {
                  // Ignorer les erreurs de parsing pendant la saisie
                }
              }}
              placeholder='{"session_token": "...", "user_id": "..."}'
              rows={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">User Agent (automatique)</label>
            <Input 
              value={formData.userAgent || ''}
              onChange={(e) => setFormData({...formData, userAgent: e.target.value})}
              placeholder="Détecté automatiquement..."
              disabled
              className="bg-gray-50 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Détecté automatiquement depuis votre navigateur
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <Textarea 
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Notes optionnelles..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Création...' : 'Créer'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Composant pour éditer un credential
const EditCredentialForm = ({ 
  credential,
  onSubmit, 
  onCancel, 
  isLoading 
}: { 
  credential: AiCredential;
  onSubmit: (data: UpdateAiCredentialInput) => Promise<AiCredentialResponse>;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    platform: credential.platform,
    credentialName: credential.credentialName,
    userIdentifier: credential.userIdentifier || '',
    sessionData: credential.sessionData,
    userAgent: credential.userAgent || '',
    notes: credential.notes || '',
    isActive: credential.isActive
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier le credential</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Plateforme</label>
              <Select 
                value={formData.platform} 
                onValueChange={(value: string) => setFormData({...formData, platform: value as AiPlatform})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(platform => (
                    <SelectItem key={platform} value={platform}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Nom du credential</label>
              <Input 
                value={formData.credentialName}
                onChange={(e) => setFormData({...formData, credentialName: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Identifiant utilisateur</label>
            <Input 
              value={formData.userIdentifier}
              onChange={(e) => setFormData({...formData, userIdentifier: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Données de session (JSON)</label>
            <Textarea 
              value={JSON.stringify(formData.sessionData, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({...formData, sessionData: parsed});
                } catch {
                  // Ignorer les erreurs de parsing pendant la saisie
                }
              }}
              rows={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">User Agent</label>
            <Input 
              value={formData.userAgent}
              onChange={(e) => setFormData({...formData, userAgent: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <Textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Credential actif
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 