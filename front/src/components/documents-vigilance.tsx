import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  ExternalLink,
  Shield,
  Scale,
  Wrench,
  Briefcase,
  FileCheck,
  DollarSign,
  Gavel,
  BarChart3,
  Settings,
  AlertCircle
} from "lucide-react";
import type { 
  MissingDocumentsPayload,
  VigilancePointsPayload 
} from "@shared/types/workflow";

interface MissingDocumentsProps {
  documents: MissingDocumentsPayload['missingDocuments'];
}

export const MissingDocumentsSection = ({ documents }: MissingDocumentsProps) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'legal': return Gavel;
      case 'financial': return DollarSign;
      case 'technical': return Wrench;
      case 'business': return Briefcase;
      case 'regulatory': return Scale;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'legal': return 'text-purple-600 bg-purple-100';
      case 'financial': return 'text-green-600 bg-green-100';
      case 'technical': return 'text-blue-600 bg-blue-100';
      case 'business': return 'text-orange-600 bg-orange-100';
      case 'regulatory': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          label: 'Critique'
        };
      case 'medium':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          label: 'Important'
        };
      case 'low':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: FileCheck,
          label: 'Optionnel'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: FileText,
          label: 'Standard'
        };
    }
  };

  const groupedByCategory = documents.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  const categoryLabels = {
    legal: 'Juridique',
    financial: 'Financier',
    technical: 'Technique',
    business: 'Business',
    regulatory: 'Réglementaire'
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-800">
              {documents.filter(d => d.priority === 'high').length}
            </div>
            <p className="text-sm text-red-600">Critiques</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-800">
              {documents.filter(d => d.priority === 'medium').length}
            </div>
            <p className="text-sm text-yellow-600">Importants</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-800">
              {documents.filter(d => d.priority === 'low').length}
            </div>
            <p className="text-sm text-blue-600">Optionnels</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">
              {documents.length}
            </div>
            <p className="text-sm text-gray-600">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents by Category */}
      {Object.entries(groupedByCategory).map(([category, docs]) => {
        const CategoryIcon = getCategoryIcon(category);
        const categoryColor = getCategoryColor(category);
        
        return (
          <Card key={category} className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`p-2 rounded-full ${categoryColor}`}>
                  <CategoryIcon className="w-5 h-5" />
                </div>
                {categoryLabels[category as keyof typeof categoryLabels] || category}
                <Badge variant="secondary">{docs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {docs.map((doc, index) => {
                  const priorityConfig = getPriorityConfig(doc.priority);
                  const PriorityIcon = priorityConfig.icon;
                  
                  return (
                    <Card key={index} className={`border ${priorityConfig.color.split(' ')[2]}`}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                                <Badge className={priorityConfig.color}>
                                  <PriorityIcon className="w-3 h-3 mr-1" />
                                  {priorityConfig.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{doc.whyMissing}</p>
                              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                <p className="text-sm text-orange-800">
                                  <strong>Impact :</strong> {doc.impactOnProject}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {doc.suggestedSources.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Sources suggérées :</p>
                              <ul className="space-y-1">
                                {doc.suggestedSources.map((source, sourceIndex) => (
                                  <li key={sourceIndex} className="flex items-center gap-2">
                                    <ExternalLink className="w-3 h-3 text-blue-500" />
                                    <span className="text-sm text-blue-600">{source}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

interface VigilancePointsProps {
  points: VigilancePointsPayload['vigilancePoints'];
}

export const VigilancePointsSection = ({ points }: VigilancePointsProps) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return DollarSign;
      case 'technical': return Wrench;
      case 'legal': return Gavel;
      case 'market': return BarChart3;
      case 'operational': return Settings;
      case 'regulatory': return Scale;
      default: return AlertTriangle;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial': return 'text-green-600 bg-green-100';
      case 'technical': return 'text-blue-600 bg-blue-100';
      case 'legal': return 'text-purple-600 bg-purple-100';
      case 'market': return 'text-orange-600 bg-orange-100';
      case 'operational': return 'text-indigo-600 bg-indigo-100';
      case 'regulatory': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskConfig = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return { 
          color: 'bg-red-100 text-red-800 border-red-300',
          bgColor: 'bg-red-50',
          icon: AlertCircle,
          label: 'Risque Élevé'
        };
      case 'medium':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          bgColor: 'bg-yellow-50',
          icon: AlertTriangle,
          label: 'Risque Moyen'
        };
      case 'low':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          bgColor: 'bg-blue-50',
          icon: Shield,
          label: 'Risque Faible'
        };
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          bgColor: 'bg-gray-50',
          icon: AlertTriangle,
          label: 'Risque Inconnu'
        };
    }
  };

  const groupedByRisk = points.reduce((acc, point) => {
    if (!acc[point.riskLevel]) {
      acc[point.riskLevel] = [];
    }
    acc[point.riskLevel].push(point);
    return acc;
  }, {} as Record<string, typeof points>);

  const categoryLabels = {
    financial: 'Financier',
    technical: 'Technique',
    legal: 'Juridique',
    market: 'Marché',
    operational: 'Opérationnel',
    regulatory: 'Réglementaire'
  };

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-800">
              {points.filter(p => p.riskLevel === 'high').length}
            </div>
            <p className="text-sm text-red-600">Risques Élevés</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-800">
              {points.filter(p => p.riskLevel === 'medium').length}
            </div>
            <p className="text-sm text-yellow-600">Risques Moyens</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-800">
              {points.filter(p => p.riskLevel === 'low').length}
            </div>
            <p className="text-sm text-blue-600">Risques Faibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Points by Risk Level */}
      {['high', 'medium', 'low'].map((riskLevel) => {
        const riskPoints = groupedByRisk[riskLevel];
        if (!riskPoints || riskPoints.length === 0) return null;
        
        const riskConfig = getRiskConfig(riskLevel);
        const RiskIcon = riskConfig.icon;
        
        return (
          <Card key={riskLevel} className={`border ${riskConfig.color.split(' ')[2]} ${riskConfig.bgColor}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RiskIcon className={`w-5 h-5 ${riskConfig.color.split(' ')[1]}`} />
                {riskConfig.label}
                <Badge variant="secondary">{riskPoints.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskPoints.map((point, index) => {
                  const CategoryIcon = getCategoryIcon(point.category);
                  const categoryColor = getCategoryColor(point.category);
                  
                  return (
                    <Card key={index} className="border-gray-200 bg-white">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1 rounded-full ${categoryColor}`}>
                                  <CategoryIcon className="w-4 h-4" />
                                </div>
                                <h4 className="font-semibold text-gray-900">{point.title}</h4>
                                <Badge variant="outline">
                                  {categoryLabels[point.category as keyof typeof categoryLabels] || point.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{point.whyVigilance}</p>
                              
                              <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-3">
                                <p className="text-sm text-red-800">
                                  <strong>Impact potentiel :</strong> {point.potentialImpact}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {point.mitigationStrategies.length > 0 && (
                              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                <h5 className="font-medium text-green-800 mb-2">Stratégies d'atténuation :</h5>
                                <ul className="space-y-1">
                                  {point.mitigationStrategies.map((strategy, strategyIndex) => (
                                    <li key={strategyIndex} className="flex items-start gap-2">
                                      <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                                      <span className="text-sm text-green-700">{strategy}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {point.monitoringRecommendations.length > 0 && (
                              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <h5 className="font-medium text-blue-800 mb-2">Recommandations de suivi :</h5>
                                <ul className="space-y-1">
                                  {point.monitoringRecommendations.map((recommendation, recIndex) => (
                                    <li key={recIndex} className="flex items-start gap-2">
                                      <Clock className="w-3 h-3 text-blue-600 mt-1 flex-shrink-0" />
                                      <span className="text-sm text-blue-700">{recommendation}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}; 