import { useState } from "react";
import { useGetStrengths, useUpdateStrengthStatus } from "@/api/strengths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp,
  CheckCircle,
  XCircle,
  Check,
  X,
  Star
} from "lucide-react";
import { queryClient } from "@/api/query-config";
import type { StrengthPoint } from "@shared/types/projects";

interface StrengthsPointsProps {
  projectUniqueId: string;
}

const StrengthPointRow = ({ point, projectUniqueId }: { 
  point: StrengthPoint; 
  projectUniqueId: string; 
}) => {
  const [showCommentField, setShowCommentField] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'resolved' | 'irrelevant' | null>(null);
  const [comment, setComment] = useState('');

  const { mutateAsync: updateStatus, isPending } = useUpdateStrengthStatus({
    onSuccess: () => {
      console.log('✅ Strength Point Mutation success!');
      queryClient.invalidateQueries({ queryKey: ["strengths", projectUniqueId] });
      setShowCommentField(false);
      setSelectedStatus(null);
      setComment('');
    },
    onError: (error: any) => {
      console.error('❌ Strength Point Mutation error:', error);
    }
  });

  const handleStatusClick = (status: 'resolved' | 'irrelevant') => {
    setSelectedStatus(status);
    setShowCommentField(true);
    // Pré-remplir le commentaire
    const defaultComment = status === 'resolved' 
      ? 'Point fort validé et exploité' 
      : 'Point fort non applicable à ce projet';
    setComment(defaultComment);
  };

  const handleConfirm = async () => {
    if (selectedStatus) {
      try {
        console.log('🚀 Starting strength point mutation:', { projectUniqueId, pointId: point.id, status: selectedStatus, whyStatus: comment.trim() });
        await updateStatus({
          projectUniqueId,
          pointId: point.id,
          status: selectedStatus,
          whyStatus: comment.trim() || undefined
        });
        console.log('🎉 Strength point mutation completed successfully!');
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
          <div className="flex items-start mb-2">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-base mb-1">{point.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{point.description}</p>
              
              {point.potentialImpact && (
                <p className="text-sm text-gray-700 mb-2">
                  {point.potentialImpact}
                </p>
              )}

              {point.recommendations && point.recommendations.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-2">
                  <p className="text-sm text-green-800 font-medium mb-1">Recommandations :</p>
                  <ul className="text-sm text-green-700 space-y-1">
                    {point.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
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
                title="Marquer comme validé"
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Commentaire de validation"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

export const StrengthsPoints = ({ projectUniqueId }: StrengthsPointsProps) => {
  const { data: strengths, isLoading, isError } = useGetStrengths(projectUniqueId);
  const [showResolved, setShowResolved] = useState(false);
  const [showIrrelevant, setShowIrrelevant] = useState(false);

  // S'assurer que strengths est toujours un tableau
  const safeStrengths = Array.isArray(strengths) ? strengths : [];

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Star className="h-5 w-5 text-green-600" />
            Points forts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
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
            <Star className="h-5 w-5 text-green-600" />
            Points forts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des points forts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!safeStrengths || safeStrengths.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Star className="h-5 w-5 text-green-600" />
            Points forts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun point fort identifié pour ce projet. Les données seront disponibles après l'étape 4 du workflow.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Grouper par statut
  const pendingPoints = safeStrengths.filter(point => point.status === 'pending');
  const resolvedPoints = safeStrengths.filter(point => point.status === 'resolved');
  const irrelevantPoints = safeStrengths.filter(point => point.status === 'irrelevant');

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Star className="h-5 w-5 text-green-600" />
            Points forts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
              {pendingPoints.length} en attente
            </Badge>
            {resolvedPoints.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                {resolvedPoints.length} validés
              </Badge>
            )}
            {irrelevantPoints.length > 0 && (
              <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600">
                {irrelevantPoints.length} non pertinents
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-0">
          {/* Points en attente */}
          {pendingPoints.map((point) => (
            <StrengthPointRow key={point.id} point={point} projectUniqueId={projectUniqueId} />
          ))}
          
          {pendingPoints.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Tous les points forts ont été traités</p>
            </div>
          )}

          {/* Section Points Validés */}
          {resolvedPoints.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Points validés ({resolvedPoints.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600">
                    {showResolved ? 'Masquer' : 'Afficher'}
                  </span>
                  <div className={`transform transition-transform ${showResolved ? 'rotate-180' : ''}`}>
                    ⌄
                  </div>
                </div>
              </button>
              
              {showResolved && (
                <div className="mt-2 space-y-2">
                  {resolvedPoints.map((point) => (
                    <div key={point.id} className="py-3 px-4 bg-blue-50/50 rounded-md border border-blue-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            <h4 className="font-medium text-gray-900 text-sm">{point.title}</h4>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{point.description}</p>
                          {point.whyStatus && (
                            <p className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1 inline-block">
                              {point.whyStatus}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-100 border-blue-200 text-blue-700">
                          Validé
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section Points Non Pertinents */}
          {irrelevantPoints.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowIrrelevant(!showIrrelevant)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-700">
                    Points non pertinents ({irrelevantPoints.length})
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
                  {irrelevantPoints.map((point) => (
                    <div key={point.id} className="py-3 px-4 bg-gray-50/50 rounded-md border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-gray-500" />
                            <h4 className="font-medium text-gray-600 text-sm line-through">{point.title}</h4>
                          </div>
                          <p className="text-xs text-gray-500 mb-2 line-through">{point.description}</p>
                          {point.whyStatus && (
                            <p className="text-xs text-gray-600 bg-gray-100 rounded px-2 py-1 inline-block">
                              {point.whyStatus}
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
