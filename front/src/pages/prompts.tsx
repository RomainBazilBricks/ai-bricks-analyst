import { useState } from 'react';
import { useGetAnalysisSteps } from "@/api/workflow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Edit3, 
  Save, 
  X, 
  Eye,
  BarChart3,
  FolderOpen,
  MessageCircle,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle
} from "lucide-react";
import { queryClient } from "@/api/query-config";
import type { AnalysisStepResponse, CreateAnalysisStepInput } from "@shared/types/projects";

interface EditingStep extends AnalysisStepResponse {
  isEditing?: boolean;
  editedName?: string;
  editedDescription?: string;
  editedPrompt?: string;
}

export const PromptsPage = () => {
  const [editingSteps, setEditingSteps] = useState<EditingStep[]>([]);
  const [savingSteps, setSavingSteps] = useState<Set<number>>(new Set());

  // Hook pour récupérer les étapes
  const {
    data: steps,
    isLoading,
    isError,
    error,
    refetch
  } = useGetAnalysisSteps();

  // Initialiser les étapes éditables quand les données sont chargées
  useState(() => {
    if (steps && editingSteps.length === 0) {
      setEditingSteps(steps.map(step => ({ ...step, isEditing: false })));
    }
  });

  const getStepIcon = (order: number) => {
    switch (order) {
      case 1: return <BarChart3 className="h-5 w-5" />;
      case 2: return <Eye className="h-5 w-5" />;
      case 3: return <FolderOpen className="h-5 w-5" />;
      case 4: return <AlertTriangle className="h-5 w-5" />;
      case 5: return <MessageCircle className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const startEditing = (stepId: number) => {
    setEditingSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              isEditing: true,
              editedName: step.name,
              editedDescription: step.description,
              editedPrompt: step.prompt
            }
          : step
      )
    );
  };

  const cancelEditing = (stepId: number) => {
    setEditingSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              isEditing: false,
              editedName: undefined,
              editedDescription: undefined,
              editedPrompt: undefined
            }
          : step
      )
    );
  };

  const updateEditingField = (stepId: number, field: 'editedName' | 'editedDescription' | 'editedPrompt', value: string) => {
    setEditingSteps(prev => 
      prev.map(step => 
        step.id === stepId 
          ? { ...step, [field]: value }
          : step
      )
    );
  };

  const saveStep = async (stepId: number) => {
    const step = editingSteps.find(s => s.id === stepId);
    if (!step || !step.isEditing) return;

    setSavingSteps(prev => new Set(prev).add(stepId));

    try {
      const updateData: CreateAnalysisStepInput = {
        name: step.editedName || step.name,
        description: step.editedDescription || step.description,
        prompt: step.editedPrompt || step.prompt,
        order: step.order,
        isActive: step.isActive ? 1 : 0,
      };

      // Appel direct à l'API
      const response = await fetch(`${import.meta.env.VITE_API_ENV === "production" ? "/api-prod" : "http://localhost:3001/api"}/workflow/steps/${stepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Mettre à jour l'état local
      setEditingSteps(prev => 
        prev.map(s => 
          s.id === stepId 
            ? { 
                ...s, 
                isEditing: false,
                name: step.editedName || s.name,
                description: step.editedDescription || s.description,
                prompt: step.editedPrompt || s.prompt,
                editedName: undefined,
                editedDescription: undefined,
                editedPrompt: undefined
              }
            : s
        )
      );

      // Invalider le cache React Query
      queryClient.invalidateQueries({ queryKey: ["workflow", "steps"] });
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setSavingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepId);
        return newSet;
      });
    }
  };

  // Mettre à jour les étapes éditables quand les données changent
  if (steps && editingSteps.length !== steps.length) {
    setEditingSteps(steps.map(step => ({ 
      ...step, 
      isEditing: false,
      ...editingSteps.find(es => es.id === step.id)
    })));
  }

  if (isError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur lors du chargement</AlertTitle>
          <AlertDescription>
            {(error as Error).message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-6 gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Prompts</h1>
            <p className="text-gray-500">Personnalisez les prompts des étapes d'analyse</p>
          </div>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="text-purple-600 border-purple-300">
            {steps?.length || 0} étapes configurées
          </Badge>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">À propos des prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Les prompts définissent les instructions données à l'IA pour chaque étape du workflow d'analyse. 
            Personnalisez-les selon vos besoins spécifiques pour obtenir des résultats optimaux.
          </p>
        </CardContent>
      </Card>

      {/* Liste des étapes */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {editingSteps.map((step) => (
            <Card key={step.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      {getStepIcon(step.order)}
                    </div>
                    <div>
                      {step.isEditing ? (
                        <Input
                          value={step.editedName || step.name}
                          onChange={(e) => updateEditingField(step.id, 'editedName', e.target.value)}
                          className="font-semibold text-lg mb-2"
                          placeholder="Nom de l'étape"
                        />
                      ) : (
                        <CardTitle className="text-lg">{step.name}</CardTitle>
                      )}
                      {step.isEditing ? (
                        <Input
                          value={step.editedDescription || step.description}
                          onChange={(e) => updateEditingField(step.id, 'editedDescription', e.target.value)}
                          className="text-sm"
                          placeholder="Description de l'étape"
                        />
                      ) : (
                        <CardDescription>{step.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Étape {step.order}</Badge>
                    {step.isActive && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Prompt d'analyse :
                    </label>
                    {step.isEditing ? (
                      <Textarea
                        value={step.editedPrompt || step.prompt}
                        onChange={(e) => updateEditingField(step.id, 'editedPrompt', e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                        placeholder="Instructions pour l'IA..."
                      />
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                          {step.prompt}
                        </pre>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    {step.isEditing ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelEditing(step.id)}
                          disabled={savingSteps.has(step.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Annuler
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => saveStep(step.id)}
                          disabled={savingSteps.has(step.id)}
                        >
                          {savingSteps.has(step.id) ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1"></div>
                              Sauvegarde...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Sauvegarder
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startEditing(step.id)}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 