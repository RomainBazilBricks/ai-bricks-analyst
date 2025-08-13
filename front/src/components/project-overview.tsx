import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  User,
  Building2,
  Target,
  Clock
} from "lucide-react";

interface ProjectOverviewProps {
  project: {
    projectUniqueId: string;
    projectName: string;
    description: string;
    budgetTotal: number;
    estimatedRoi: number;
    startDate: Date;
    fundingExpectedDate: Date;
    company?: {
      name: string;
      siret: string;
      reputationDescription: string;
    };
    projectOwner?: {
      name: string;
      experienceYears: number;
      reputationDescription: string;
    };
  };
  onStartAnalysis?: () => void;
  analysisInProgress?: boolean;
}

export const ProjectOverview = ({ 
  project, 
  onStartAnalysis, 
  analysisInProgress = false 
}: ProjectOverviewProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  };

  const getRiskLevel = (roi: number) => {
    if (roi >= 8) return { level: 'Élevé', color: 'bg-green-100 text-green-800' };
    if (roi >= 5) return { level: 'Moyen', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'Faible', color: 'bg-red-100 text-red-800' };
  };

  const riskAssessment = getRiskLevel(project.estimatedRoi);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {project.projectUniqueId}
              </Badge>
              <Badge className={riskAssessment.color}>
                ROI {riskAssessment.level}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">{project.projectName}</h1>
            <p className="text-blue-100 max-w-2xl">{project.description}</p>
          </div>
          <Button 
            onClick={onStartAnalysis}
            disabled={analysisInProgress}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            {analysisInProgress ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Lancer l'analyse IA
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Budget Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(project.budgetTotal)}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ROI Estimé</p>
                <p className="text-2xl font-bold text-gray-900">
                  {project.estimatedRoi.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Début Prévu</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(project.startDate)}
                </p>
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Financement</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(project.fundingExpectedDate)}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-full">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        {project.company && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-gray-900">{project.company.name}</p>
                <p className="text-sm text-gray-600">SIRET: {project.company.siret}</p>
              </div>
              {project.company.reputationDescription && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Réputation</p>
                  <p className="text-sm text-gray-600">{project.company.reputationDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Project Owner Information */}
        {project.projectOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Porteur de Projet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-gray-900">{project.projectOwner.name}</p>
                <p className="text-sm text-gray-600">
                  {project.projectOwner.experienceYears} ans d'expérience
                </p>
              </div>
              {project.projectOwner.reputationDescription && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Profil</p>
                  <p className="text-sm text-gray-600">{project.projectOwner.reputationDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}; 