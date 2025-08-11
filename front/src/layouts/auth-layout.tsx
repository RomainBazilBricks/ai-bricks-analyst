import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  // Pas de filtrage d'authentification - accessible à tous
  return <>{children}</>;
}; 