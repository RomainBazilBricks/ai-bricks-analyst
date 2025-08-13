import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Target,
  BarChart3,
  Users,
  DollarSign,
  Lightbulb,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  ArrowRight
} from "lucide-react";
import type { 
  AnalysisMacroPayload,
  AnalysisDescriptionPayload 
} from "@shared/types/workflow";

interface AnalysisSectionProps {
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  onTrigger?: () => void;
  children: React.ReactNode;
}

const AnalysisSection = ({ title, status, onTrigger, children }: AnalysisSectionProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'in_progress':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'failed':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: Brain,
          color: 'text-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <Card className={`${config.borderColor} ${status === 'completed' ? config.bgColor : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
            {title}
          </CardTitle>
          {status === 'pending' && onTrigger && (
            <Button onClick={onTrigger} size="sm" variant="outline">
              <Brain className="w-4 h-4 mr-2" />
              Analyser
            </Button>
          )}
          {status === 'in_progress' && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Clock className="w-3 h-3 mr-1 animate-spin" />
              En cours
            </Badge>
          )}
          {status === 'completed' && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Terminé
            </Badge>
          )}
        </div>
      </CardHeader>
      {status === 'completed' && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  );
};

interface MacroAnalysisProps {
  data: AnalysisMacroPayload['macroAnalysis'];
}

export const MacroAnalysisSection = ({ data }: MacroAnalysisProps) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const metrics = [
    { label: 'Risque Global', value: data.overallRisk, icon: AlertTriangle },
    { label: 'Potentiel Marché', value: data.marketPotential, icon: TrendingUp },
    { label: 'Faisabilité Technique', value: data.technicalFeasibility, icon: Target },
    { label: 'Viabilité Financière', value: data.financialViability, icon: DollarSign },
    { label: 'Avantage Concurrentiel', value: data.competitiveAdvantage, icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Résumé de l'analyse</h4>
        <p className="text-blue-800">{data.summary}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((metric) => {
          const IconComponent = metric.icon;
          return (
            <div key={metric.label} className="text-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-gray-100 rounded-full">
                  <IconComponent className="w-6 h-6 text-gray-600" />
                </div>
                <Badge className={getRiskColor(metric.value)}>
                  {metric.value.toUpperCase()}
                </Badge>
                <p className="text-xs text-gray-600 font-medium">{metric.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <ThumbsUp className="w-5 h-5" />
              Points Forts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.keyStrengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-green-800">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <ThumbsDown className="w-5 h-5" />
              Points Faibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.keyWeaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-800">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Actions */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Lightbulb className="w-5 h-5" />
            Actions Recommandées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data.recommendedActions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-purple-800">{index + 1}</span>
                </div>
                <span className="text-sm text-purple-800">{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

interface DetailedAnalysisProps {
  data: AnalysisDescriptionPayload['detailedAnalysis'];
}

export const DetailedAnalysisSection = ({ data }: DetailedAnalysisProps) => {
  const sections = [
    {
      title: 'Modèle Économique',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      content: data.businessModel
    },
    {
      title: 'Analyse de Marché',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      content: data.marketAnalysis
    },
    {
      title: 'Analyse Technique',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      content: data.technicalAnalysis
    },
    {
      title: 'Projections Financières',
      icon: BarChart3,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      content: data.financialProjections
    },
    {
      title: 'Évaluation Équipe',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      content: data.teamAssessment
    }
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const IconComponent = section.icon;
        return (
          <Card key={section.title} className={`${section.borderColor} ${section.bgColor}`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${section.color}`}>
                <IconComponent className="w-5 h-5" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(section.content).map(([key, value]) => (
                <div key={key}>
                  <h5 className="font-medium text-gray-900 mb-2 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </h5>
                  {Array.isArray(value) ? (
                    <ul className="space-y-1">
                      {value.map((item, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-700">{value}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export { AnalysisSection }; 