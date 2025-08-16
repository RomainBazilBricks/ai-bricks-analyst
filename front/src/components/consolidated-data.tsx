import { useGetConsolidatedData, type ConsolidatedData } from "@/api/consolidated-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  DollarSign, 
  Home, 
  User, 
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

interface ConsolidatedDataProps {
  projectUniqueId: string;
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

export const ConsolidatedData = ({ projectUniqueId }: ConsolidatedDataProps) => {
  const { data: consolidatedData, isLoading, isError, error } = useGetConsolidatedData(projectUniqueId);

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
          <div className="text-xs text-gray-500">
            {new Date(consolidatedData.updatedAt).toLocaleDateString('fr-FR')}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
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
                  <p className="text-xs text-gray-600 mb-0.5">Prix marché</p>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(consolidatedData.propertyMarketReferencePrice)}</p>
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
              <div className="flex items-center gap-1.5 mb-2">
                <User className="h-3.5 w-3.5 text-purple-600" />
                <h3 className="text-sm font-medium text-gray-800">Porteur</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Expérience</span>
                  <span className="text-sm font-medium text-gray-900">{formatNumber(consolidatedData.carrierExperienceYears, " ans")}</span>
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
              </div>
            </div>

            {/* Société Porteuse */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-md p-3 border border-orange-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Building2 className="h-3.5 w-3.5 text-orange-600" />
                <h3 className="text-sm font-medium text-gray-800">Société</h3>
              </div>
              <div className="space-y-2">
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
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
