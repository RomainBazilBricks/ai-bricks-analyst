import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { 
  useOpenRouterHealth, 
  useOpenRouterModels, 
  useCallGPT4o, 
  useQuickTestGPT4o,
  useTestOpenRouterModel 
} from '@/api/openrouter';

export const OpenRouterTestPage = () => {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);

  // Hooks pour les données
  const { data: healthData, isLoading: healthLoading } = useOpenRouterHealth();
  const { data: modelsData, isLoading: modelsLoading } = useOpenRouterModels();
  const { data: quickTestData, isLoading: quickTestLoading } = useQuickTestGPT4o();

  // Hooks pour les mutations
  const { mutateAsync: callGPT4o, isPending: gpt4oPending, isError: gpt4oError, error: gpt4oErrorData } = useCallGPT4o({
    onSuccess: () => {
      console.log('✅ Appel GPT-4o réussi');
    }
  });

  const { mutateAsync: testModel, isPending: testPending, isError: testError, error: testErrorData } = useTestOpenRouterModel({
    onSuccess: () => {
      console.log('✅ Test modèle réussi');
    }
  });

  const [response, setResponse] = useState<string>('');
  const [usage, setUsage] = useState<any>(null);

  const handleGPT4oCall = async () => {
    if (!prompt.trim()) return;

    try {
      const result = await callGPT4o({
        prompt: prompt.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        temperature,
        max_tokens: maxTokens
      });

      if (result.success) {
        setResponse(result.response || 'Pas de réponse');
        setUsage(result.usage);
      } else {
        setResponse(`Erreur: ${result.error}`);
        setUsage(null);
      }
    } catch (error) {
      console.error('Erreur appel GPT-4o:', error);
      setResponse(`Erreur: ${(error as Error).message}`);
      setUsage(null);
    }
  };

  const handleTestModel = async (model: string) => {
    try {
      const result = await testModel({
        model: model as any,
        prompt: 'Dis simplement bonjour !',
        temperature: 0.7,
        max_tokens: 50
      });

      if (result.success) {
        setResponse(`[${model}] ${result.response}`);
        setUsage(result.usage);
      } else {
        setResponse(`[${model}] Erreur: ${result.error}`);
        setUsage(null);
      }
    } catch (error) {
      console.error(`Erreur test ${model}:`, error);
      setResponse(`[${model}] Erreur: ${(error as Error).message}`);
      setUsage(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Test OpenRouter</h1>
        <p className="text-gray-600">Interface de test pour l'intégration OpenRouter</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Check */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connectivité</CardTitle>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Badge variant="secondary">Vérification...</Badge>
            ) : healthData?.success ? (
              <Badge variant="default" className="bg-green-500">✅ Connecté</Badge>
            ) : (
              <Badge variant="destructive">❌ Erreur</Badge>
            )}
            {healthData && (
              <p className="text-sm text-gray-600 mt-2">{healthData.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Models Count */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modèles</CardTitle>
          </CardHeader>
          <CardContent>
            {modelsLoading ? (
              <Badge variant="secondary">Chargement...</Badge>
            ) : (
              <Badge variant="outline">{modelsData?.count || 0} modèles</Badge>
            )}
          </CardContent>
        </Card>

        {/* Quick Test */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Test GPT-4o</CardTitle>
          </CardHeader>
          <CardContent>
            {quickTestLoading ? (
              <Badge variant="secondary">Test...</Badge>
            ) : quickTestData?.success ? (
              <Badge variant="default" className="bg-green-500">✅ Fonctionne</Badge>
            ) : (
              <Badge variant="destructive">❌ Erreur</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GPT-4o Test Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Test GPT-4o Personnalisé</CardTitle>
          <CardDescription>
            Testez GPT-4o avec vos propres prompts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Prompt principal *</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Entrez votre prompt ici..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Prompt système (optionnel)</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Instructions système pour l'IA..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Température</label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Tokens</label>
              <Input
                type="number"
                min="1"
                max="4000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              />
            </div>
          </div>

          <Button 
            onClick={handleGPT4oCall} 
            disabled={!prompt.trim() || gpt4oPending}
            className="w-full"
          >
            {gpt4oPending ? 'Appel en cours...' : 'Appeler GPT-4o'}
          </Button>

          {gpt4oError && (
            <Alert variant="destructive">
              <p>Erreur: {(gpt4oErrorData as any)?.message || 'Erreur inconnue'}</p>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Models Test */}
      {modelsData?.models && (
        <Card>
          <CardHeader>
            <CardTitle>Test des Modèles</CardTitle>
            <CardDescription>
              Testez différents modèles avec un prompt simple
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {modelsData.models.map((model) => (
                <Button
                  key={model}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestModel(model)}
                  disabled={testPending}
                  className="text-left justify-start"
                >
                  {model}
                </Button>
              ))}
            </div>

            {testError && (
              <Alert variant="destructive" className="mt-4">
                <p>Erreur: {(testErrorData as any)?.message || 'Erreur inconnue'}</p>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Response Display */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Réponse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{response}</p>
            </div>
            
            {usage && (
              <div className="mt-4 flex gap-4 text-sm text-gray-600">
                <span>Tokens prompt: {usage.prompt_tokens}</span>
                <span>Tokens réponse: {usage.completion_tokens}</span>
                <span>Total: {usage.total_tokens}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
