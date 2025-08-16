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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Données consolidées
        </CardTitle>
        <CardDescription>
          Données extraites et structurées par l'IA lors de l'analyse du projet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Données Financières */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
            Données Financières
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Prix d'acquisition</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.financialAcquisitionPrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Coût travaux</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.financialWorksCost)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Prix revente prévu</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.financialPlannedResalePrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Apport personnel</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.financialPersonalContribution)}</p>
            </div>
          </div>
        </div>

        {/* Données du Bien */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-lg">
            <Home className="h-5 w-5 text-blue-600" />
            Données du Bien
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Surface habitable</p>
              <p className="text-lg font-semibold">{formatNumber(consolidatedData.propertyLivingArea, " m²")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Prix marché réf.</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.propertyMarketReferencePrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Loyers mensuels HT</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.propertyMonthlyRentExcludingTax)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Logements pré-vendus</p>
              <p className="text-lg font-semibold">{formatNumber(consolidatedData.propertyPresoldUnits)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Logements total</p>
              <p className="text-lg font-semibold">{formatNumber(consolidatedData.propertyTotalUnits)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Taux pré-commercialisation</p>
              <p className="text-lg font-semibold">{formatPercentage(consolidatedData.propertyPreMarketingRate)}</p>
            </div>
          </div>
        </div>

        {/* Données Porteur */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-lg">
            <User className="h-5 w-5 text-purple-600" />
            Données Porteur
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Expérience</p>
              <p className="text-lg font-semibold">{formatNumber(consolidatedData.carrierExperienceYears, " ans")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Opérations réussies</p>
              <p className="text-lg font-semibold">{formatNumber(consolidatedData.carrierSuccessfulOperations)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Litiges actifs</p>
              <div className="flex items-center gap-2">
                {getBooleanIcon(consolidatedData.carrierHasActiveLitigation)}
                <p className="text-lg font-semibold">{formatBoolean(consolidatedData.carrierHasActiveLitigation)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Société Porteuse */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-lg">
            <Building2 className="h-5 w-5 text-orange-600" />
            Société Porteuse
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Années d'existence</p>
              <p className="text-lg font-semibold">{formatNumber(consolidatedData.companyYearsOfExistence, " ans")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Résultat net N-1</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.companyNetResultYear1)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Résultat net N-2</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.companyNetResultYear2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Résultat net N-3</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.companyNetResultYear3)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Endettement total</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.companyTotalDebt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Capitaux propres</p>
              <p className="text-lg font-semibold">{formatCurrency(consolidatedData.companyEquity)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Ratio d'endettement</p>
              <p className="text-lg font-semibold">{formatPercentage(consolidatedData.companyDebtRatio)}</p>
            </div>
          </div>
        </div>

        {/* Métadonnées */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Dernière mise à jour : {new Date(consolidatedData.updatedAt).toLocaleString('fr-FR')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
