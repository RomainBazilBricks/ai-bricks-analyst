import { useState } from "react";
import { useGetVigilancePoints, useUpdateVigilancePointStatus, type VigilancePoint } from "@/api/vigilance-points";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Check,
  X,
  Shield
} from "lucide-react";
import { queryClient } from "@/api/query-config";

interface VigilancePointsProps {
  projectUniqueId: string;
}





const getStatusIcon = (status: string) => {
  switch (status) {
    case 'resolved': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'irrelevant': return <XCircle className="h-4 w-4 text-gray-500" />;
    case 'pending': return <Clock className="h-4 w-4 text-orange-600" />;
    default: return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

const VigilancePointRow = ({ point, projectUniqueId }: { 
  point: VigilancePoint; 
  projectUniqueId: string; 
}) => {
  const [showCommentField, setShowCommentField] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'resolved' | 'irrelevant' | null>(null);
  const [comment, setComment] = useState('');

  const { mutateAsync: updateStatus, isPending } = useUpdateVigilancePointStatus({
    onSuccess: () => {
      console.log('✅ Vigilance Point Mutation success!');
      queryClient.invalidateQueries({ queryKey: ["vigilance-points", projectUniqueId] });
      setShowCommentField(false);
      setSelectedStatus(null);
      setComment('');
    },
    onError: (error) => {
      console.error('❌ Vigilance Point Mutation error:', error);
    }
  });

  const handleStatusClick = (status: 'resolved' | 'irrelevant') => {
    setSelectedStatus(status);
    setShowCommentField(true);
    // Pré-remplir le commentaire
    const defaultComment = status === 'resolved' 
      ? 'Point de vigilance traité et résolu' 
      : 'Point de vigilance non applicable à ce projet';
    setComment(defaultComment);
  };

  const handleConfirm = async () => {
    if (selectedStatus) {
      try {
        console.log('🚀 Starting vigilance point mutation:', { projectUniqueId, pointId: point.id, status: selectedStatus, whyStatus: comment.trim() });
        await updateStatus({
          projectUniqueId,
          pointId: point.id,
          status: selectedStatus,
          whyStatus: comment.trim() || undefined
        });
        console.log('🎉 Vigilance point mutation completed successfully!');
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

              {point.recommendedActions && point.recommendedActions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-2">
                  <p className="text-sm text-blue-800 font-medium mb-1">Actions recommandées :</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {point.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{action}</span>
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
                title="Marquer comme résolu"
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Commentaire de résolution"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

export const VigilancePoints = ({ projectUniqueId }: VigilancePointsProps) => {
  const { data: vigilancePoints, isLoading, isError, error } = useGetVigilancePoints(projectUniqueId);
  const [showResolved, setShowResolved] = useState(false);
  const [showIrrelevant, setShowIrrelevant] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Shield className="h-5 w-5 text-red-600" />
            Points de vigilance
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
            <Shield className="h-5 w-5 text-red-600" />
            Points de vigilance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des points de vigilance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!vigilancePoints || vigilancePoints.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Shield className="h-5 w-5 text-red-600" />
            Points de vigilance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun point de vigilance identifié pour ce projet. Les données seront disponibles après l'étape 4 du workflow.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Grouper par statut
  const pendingPoints = vigilancePoints.filter(point => point.status === 'pending');
  const resolvedPoints = vigilancePoints.filter(point => point.status === 'resolved');
  const irrelevantPoints = vigilancePoints.filter(point => point.status === 'irrelevant');

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <Shield className="h-5 w-5 text-red-600" />
            Points de vigilance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-50 border-red-200 text-red-800">
              {pendingPoints.length} en attente
            </Badge>
            {resolvedPoints.length > 0 && (
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                {resolvedPoints.length} résolus
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
            <VigilancePointRow key={point.id} point={point} projectUniqueId={projectUniqueId} />
          ))}
          
          {pendingPoints.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Tous les points de vigilance ont été traités</p>
            </div>
          )}

          {/* Section Points Résolus */}
          {resolvedPoints.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className="flex items-center justify-between w-full p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">
                    Points résolus ({resolvedPoints.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600">
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
                    <div key={point.id} className="py-3 px-4 bg-green-50/50 rounded-md border border-green-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <h4 className="font-medium text-gray-900 text-sm">{point.title}</h4>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{point.description}</p>
                          {point.whyStatus && (
                            <p className="text-xs text-green-700 bg-green-100 rounded px-2 py-1 inline-block">
                              {point.whyStatus}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-100 border-green-200 text-green-700">
                          Résolu
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
