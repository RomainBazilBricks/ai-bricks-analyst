import { useGetStrengths } from "@/api/strengths";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp,
  CheckCircle,
  Star
} from "lucide-react";
import type { StrengthPoint } from "@shared/types/projects";

interface StrengthsPointsProps {
  projectUniqueId: string;
}

const StrengthPointRow = ({ point }: { point: StrengthPoint }) => {
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
          <Badge 
            variant="outline" 
            className={`text-xs ${
              point.riskLevel === 'high' 
                ? 'bg-green-100 border-green-300 text-green-800' 
                : point.riskLevel === 'medium'
                ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                : 'bg-blue-100 border-blue-300 text-blue-800'
            }`}
          >
            {point.riskLevel === 'high' && 'Impact élevé'}
            {point.riskLevel === 'medium' && 'Impact moyen'}
            {point.riskLevel === 'low' && 'Impact faible'}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export const StrengthsPoints = ({ projectUniqueId }: StrengthsPointsProps) => {
  const { data: strengths, isLoading, isError } = useGetStrengths(projectUniqueId);

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
              {safeStrengths.length} identifiés
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-0">
          {safeStrengths.map((point) => (
            <StrengthPointRow key={point.id} point={point} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
