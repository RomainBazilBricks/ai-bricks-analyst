import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Code, 
  Brain,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  CheckCircle
} from "lucide-react";

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: boolean;
  requestBody?: any;
  queryParams?: any;
  response: any;
  usage: string;
}

const Endpoint = ({ method, path, description, auth, requestBody, queryParams, response, usage }: EndpointProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800 border-green-300';
      case 'POST': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PUT': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fullUrl = `http://localhost:3001/api${path}`;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={`${getMethodColor(method)} font-mono text-xs px-2 py-1`}>
              {method}
            </Badge>
            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
              {path}
            </code>
            {!auth && (
              <Badge variant="outline" className="text-xs">
                Public
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(fullUrl)}
              className="h-8 w-8 p-0"
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription className="mt-2">
          {description}
        </CardDescription>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {requestBody && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Corps de la requête :</h4>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                <code>{JSON.stringify(requestBody, null, 2)}</code>
              </pre>
            </div>
          )}
          
          {queryParams && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Paramètres de requête :</h4>
              <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                <code>{JSON.stringify(queryParams, null, 2)}</code>
              </pre>
            </div>
          )}
          
          <div>
            <h4 className="font-semibold text-sm mb-2">Réponse :</h4>
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
              <code>{JSON.stringify(response, null, 2)}</code>
            </pre>
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-2">Utilisation :</h4>
            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              {usage}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Endpoints spécifiques pour ManusAI
const manusEndpoints = [
  {
    method: 'POST' as const,
    path: '/workflow/step-1-overview',
    description: 'Endpoint ManusAI - Mise à jour Étape 1 (Vue d\'ensemble)',
    auth: false,
    requestBody: {
      projectUniqueId: "ab12",
      content: "Vue d'ensemble du projet...",
      manusConversationUrl: "https://manus.ai/conversation/789"
    },
    response: {
      success: true,
      message: "Étape 1 mise à jour avec succès"
    },
    usage: "Endpoint public appelé par ManusAI pour mettre à jour l'étape 1 (Vue d'ensemble). Pas d'authentification requise."
  },
  {
    method: 'POST' as const,
    path: '/workflow/step-2-analysis',
    description: 'Endpoint ManusAI - Mise à jour Étape 2 (Analyse globale)',
    auth: false,
    requestBody: {
      projectUniqueId: "ab12",
      content: "Analyse détaillée du projet...",
      manusConversationUrl: "https://manus.ai/conversation/790"
    },
    response: {
      success: true,
      message: "Étape 2 mise à jour avec succès"
    },
    usage: "Endpoint public appelé par ManusAI pour mettre à jour l'étape 2 (Analyse globale)."
  },
  {
    method: 'POST' as const,
    path: '/workflow/step-3-documents',
    description: 'Endpoint ManusAI - Mise à jour Étape 3 (Documents manquants)',
    auth: false,
    requestBody: {
      projectUniqueId: "ab12",
      content: "Liste des documents requis...",
      manusConversationUrl: "https://manus.ai/conversation/791"
    },
    response: {
      success: true,
      message: "Étape 3 mise à jour avec succès"
    },
    usage: "Endpoint public appelé par ManusAI pour mettre à jour l'étape 3 (Documents manquants)."
  },
  {
    method: 'POST' as const,
    path: '/workflow/step-4-message',
    description: 'Endpoint ManusAI - Mise à jour Étape 4 (Message de synthèse)',
    auth: false,
    requestBody: {
      projectUniqueId: "ab12",
      content: "Message de synthèse final...",
      manusConversationUrl: "https://manus.ai/conversation/792"
    },
    response: {
      success: true,
      message: "Étape 4 mise à jour avec succès"
    },
    usage: "Endpoint public appelé par ManusAI pour mettre à jour l'étape 4 (Message de synthèse)."
  }
];

export const ApiDocumentationPage = () => {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">API ManusAI</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Documentation des endpoints pour la communication avec l'outil externe ManusAI
        </p>
      </div>

      <div className="grid gap-6">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <code className="bg-gray-100 px-3 py-1 rounded">http://localhost:3001/api</code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Authentification</h3>
              <p className="text-sm text-gray-600">
                Les endpoints ManusAI sont <strong>publics</strong> et ne nécessitent pas d'authentification.
                Ils sont conçus pour être appelés directement par l'outil externe ManusAI.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Format</h3>
              <p className="text-sm text-gray-600">
                Toutes les requêtes et réponses utilisent le format JSON.
                Content-Type: <code>application/json</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints ManusAI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Endpoints ManusAI
            </CardTitle>
            <CardDescription>
              Endpoints publics pour la communication avec l'outil externe d'analyse ManusAI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {manusEndpoints.map((endpoint, index) => (
              <Endpoint
                key={index}
                method={endpoint.method}
                path={endpoint.path}
                description={endpoint.description}
                auth={endpoint.auth}
                requestBody={endpoint.requestBody}
                response={endpoint.response}
                usage={endpoint.usage}
              />
            ))}
          </CardContent>
        </Card>

        {/* Workflow d'utilisation */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow d'utilisation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Étape 1 - Vue d'ensemble</h4>
                  <p className="text-sm text-gray-600">
                    ManusAI analyse le projet et envoie une vue d'ensemble via <code>/workflow/step-1-overview</code>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Étape 2 - Analyse globale</h4>
                  <p className="text-sm text-gray-600">
                    Analyse détaillée du projet via <code>/workflow/step-2-analysis</code>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Étape 3 - Documents manquants</h4>
                  <p className="text-sm text-gray-600">
                    Liste des documents requis via <code>/workflow/step-3-documents</code>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Étape 4 - Message de synthèse</h4>
                  <p className="text-sm text-gray-600">
                    Message final récapitulatif via <code>/workflow/step-4-message</code>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 