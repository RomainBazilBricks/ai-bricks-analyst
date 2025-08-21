import { useGetConsolidatedData } from "@/api/consolidated-data";
import { useGetProjectDetails } from "@/api/project-details";
import { useRetryStep } from "@/api/external-tools";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { 
  DollarSign, 
  Home, 
  User, 
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw, // ✅ Nouveau icône pour le bouton Relancer
  Star,
  ChevronDown
} from "lucide-react";
import { queryClient } from "@/api/query-config";

interface ConsolidatedDataProps {
  projectUniqueId: string;
  latestConversationUrl?: string; // ✅ Ajouter le conversationUrl
}

const formatCurrency = (amount: number | null) => {
  if (amount === null) return "Non défini";
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const formatNumber = (value: number | null, suffix = "") => {
  if (value === null) return "Non défini";
  return `${value.toLocaleString('fr-FR')}${suffix}`;
};

const formatPercentage = (value: number | null) => {
  if (value === null) return "Non défini";
  return `${value}%`;
};

const formatBoolean = (value: boolean | null) => {
  if (value === null) return "Non défini";
  return value ? "Oui" : "Non";
};

const getBooleanIcon = (value: boolean | null) => {
  if (value === null) return <AlertTriangle className="h-4 w-4 text-gray-400" />;
  return value ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />;
};

export const ConsolidatedDataComponent = ({ projectUniqueId, latestConversationUrl }: ConsolidatedDataProps) => {
  const { data: consolidatedData, isLoading, isError } = useGetConsolidatedData(projectUniqueId);
  const { data: projectDetails, isLoading: isLoadingDetails, isError: isErrorDetails } = useGetProjectDetails(projectUniqueId);
  
  // Debug: log des données récupérées
  console.log('🔍 Debug ConsolidatedData:', {
    projectUniqueId,
    projectDetails,
    isLoadingDetails,
    isErrorDetails,
    hasProjectOwner: !!projectDetails?.projectOwner,
    hasCompany: !!projectDetails?.company,
    projectOwnerData: projectDetails?.projectOwner,
    companyData: projectDetails?.company
  });
  
  // ✅ Hook pour relancer l'étape 2 (Consolidation des données)
  const { mutateAsync: retryStep, isPending: isRetrying } = useRetryStep(
    projectUniqueId, 
    2, 
    latestConversationUrl, // ✅ Réutiliser le conversationUrl comme le bouton Play
    {
      onSuccess: () => {
        console.log('✅ Étape 2 relancée avec succès en mode debug');
        // Invalider les caches pour rafraîchir les données
        queryClient.invalidateQueries({ queryKey: ["consolidated-data", projectUniqueId] });
      },
      onError: (error) => {
        console.error('❌ Erreur lors du relancement de l\'étape 2:', error);
      }
    }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Données consolidées
          </CardTitle>
          <CardDescription>Chargement des données...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError || !consolidatedData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Données consolidées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {isError ? 
                "Erreur lors du chargement des données consolidées." : 
                "Aucune donnée consolidée disponible pour ce projet. Les données seront disponibles après l'étape 2 du workflow."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            Données consolidées
          </CardTitle>
          {/* ✅ Bouton Relancer - Version discrète */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => retryStep()}
            disabled={isRetrying}
            className="flex items-center gap-1 h-7 px-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 opacity-60 hover:opacity-100 transition-all"
            title="Relancer la consolidation des données"
          >
            <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isRetrying ? 'Relance...' : 'Relancer'}</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Debug temporaire */}
          {isLoadingDetails && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
              🔄 Chargement des détails du projet...
            </div>
          )}
          
          {isErrorDetails && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
              ❌ Erreur lors du chargement des détails: {isErrorDetails}
            </div>
          )}
          
          {projectDetails && !projectDetails.projectOwner && !projectDetails.company && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              ⚠️ Aucune donnée de réputation trouvée (porteur: {projectDetails.projectOwner ? 'OUI' : 'NON'}, société: {projectDetails.company ? 'OUI' : 'NON'})
            </div>
          )}
          

          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Colonne gauche */}
            <div className="space-y-3">
              {/* Données Financières */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-md p-3 border border-green-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign className="h-3.5 w-3.5 text-green-600" />
                  <h3 className="text-sm font-medium text-gray-800">Financier</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Acquisition</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.financialAcquisitionPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Travaux</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.financialWorksCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Revente prévue</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.financialPlannedResalePrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Apport</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.financialPersonalContribution)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Coût/m² acquisition</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.financialAcquisitionPricePerSqm)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Prix marché/m²</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.financialMarketPricePerSqm)}</p>
                  </div>
                </div>
              </div>

              {/* Données du Bien */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md p-3 border border-blue-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <Home className="h-3.5 w-3.5 text-blue-600" />
                  <h3 className="text-sm font-medium text-gray-800">Bien immobilier</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Surface</p>
                    <p className="text-sm font-medium text-gray-900">{formatNumber(consolidatedData.propertyLivingArea, " m²")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Loyers HT</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.propertyMonthlyRentExcludingTax)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Pré-commerc.</p>
                    <p className="text-sm font-medium text-gray-900">{formatPercentage(consolidatedData.propertyPreMarketingRate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Pré-vendus</p>
                    <p className="text-sm font-medium text-gray-900">{formatNumber(consolidatedData.propertyPresoldUnits)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Total logements</p>
                    <p className="text-sm font-medium text-gray-900">{formatNumber(consolidatedData.propertyTotalUnits)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-3">
              {/* Données Porteur */}
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-md p-3 border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-purple-600" />
                    <h3 className="text-sm font-medium text-gray-800">
                      {projectDetails?.projectOwner?.name || "Porteur"}
                    </h3>
                  </div>
                  {projectDetails?.projectOwner?.reputationScore && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs font-medium text-gray-700">
                        {projectDetails.projectOwner.reputationScore}/10
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Expérience</span>
                    <span className="text-sm font-medium text-gray-900">
                      {projectDetails?.projectOwner?.experienceYears 
                        ? `${projectDetails.projectOwner.experienceYears} ans`
                        : formatNumber(consolidatedData.carrierExperienceYears, " ans")
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Opérations réussies</span>
                    <span className="text-sm font-medium text-gray-900">{formatNumber(consolidatedData.carrierSuccessfulOperations)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Litiges actifs</span>
                    <div className="flex items-center gap-1">
                      {getBooleanIcon(consolidatedData.carrierHasActiveLitigation)}
                      <span className="text-sm font-medium text-gray-900">{formatBoolean(consolidatedData.carrierHasActiveLitigation)}</span>
                    </div>
                  </div>
                  {projectDetails?.projectOwner?.reputationJustification && (
                    <div className="border-t border-purple-200 pt-2">
                      <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer text-xs font-medium text-purple-700 hover:text-purple-900">
                          <span>Détail de l'analyse</span>
                          <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-2 p-2 bg-white rounded border border-purple-100">
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {projectDetails.projectOwner.reputationJustification}
                          </p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>

              {/* Société Porteuse */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-md p-3 border border-orange-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-orange-600" />
                    <h3 className="text-sm font-medium text-gray-800">
                      {projectDetails?.company?.name || "Société"}
                    </h3>
                  </div>
                  {projectDetails?.company?.reputationScore && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs font-medium text-gray-700">
                        {projectDetails.company.reputationScore}/10
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {projectDetails?.company?.siret && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">SIRET</span>
                      <span className="text-xs font-mono text-gray-900">{projectDetails.company.siret}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Existence</span>
                    <span className="text-sm font-medium text-gray-900">{formatNumber(consolidatedData.companyYearsOfExistence, " ans")}</span>
                  </div>
                  
                  {/* Résultats compacts */}
                  <div className="border-t border-orange-200 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Résultat N-1</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.companyNetResultYear1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Résultat N-2</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.companyNetResultYear2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Résultat N-3</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.companyNetResultYear3)}</span>
                    </div>
                  </div>

                  {/* Bilan compact */}
                  <div className="border-t border-orange-200 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Endettement</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.companyTotalDebt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Capitaux propres</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.companyEquity)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Ratio endettement</span>
                      <span className="text-sm font-medium text-gray-900">{formatPercentage(consolidatedData.companyDebtRatio)}</span>
                    </div>
                  </div>

                  {projectDetails?.company?.reputationJustification && (
                    <div className="border-t border-orange-200 pt-2">
                      <details className="group">
                        <summary className="flex items-center justify-between cursor-pointer text-xs font-medium text-orange-700 hover:text-orange-900">
                          <span>Détail de l'analyse</span>
                          <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="mt-2 p-2 bg-white rounded border border-orange-100">
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                            {projectDetails.company.reputationJustification}
                          </p>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
