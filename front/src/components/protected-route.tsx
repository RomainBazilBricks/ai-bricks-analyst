import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Composant pour protéger les routes - seuls les admins peuvent accéder
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Accès refusé
          </h1>
          <p className="text-gray-600 mb-4">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <button 
            onClick={() => useAuthStore.getState().logout()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
