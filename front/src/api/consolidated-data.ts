import { useFetcher } from "@/api/api";

/**
 * Type pour les données consolidées
 */
export type ConsolidatedData = {
  id: string;
  projectId: string;
  // Données financières
  financialAcquisitionPrice: number | null;
  financialWorksCost: number | null;
  financialPlannedResalePrice: number | null;
  financialPersonalContribution: number | null;
  // Données du bien
  propertyLivingArea: number | null;
  propertyMarketReferencePrice: number | null;
  propertyMonthlyRentExcludingTax: number | null;
  propertyPresoldUnits: number | null;
  propertyTotalUnits: number | null;
  propertyPreMarketingRate: number | null;
  // Données porteur
  carrierExperienceYears: number | null;
  carrierSuccessfulOperations: number | null;
  carrierHasActiveLitigation: boolean | null;
  // Données société
  companyYearsOfExistence: number | null;
  companyNetResultYear1: number | null;
  companyNetResultYear2: number | null;
  companyNetResultYear3: number | null;
  companyTotalDebt: number | null;
  companyEquity: number | null;
  companyDebtRatio: number | null;
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Hook pour récupérer les données consolidées d'un projet
 */
export const useGetConsolidatedData = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, ConsolidatedData>({
    key: ["consolidated-data", projectUniqueId],
    path: `/projects/${projectUniqueId}/consolidated-data`,
    options: {
      enabled: !!projectUniqueId,
      retry: (failureCount, error: any) => {
        // Ne pas retry si c'est une 404 (pas de données consolidées encore)
        if (error?.response?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      retryOnMount: false,
      refetchOnWindowFocus: false,
      ...options,
    },
  });
