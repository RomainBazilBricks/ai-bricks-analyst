import { BrowserRouter, useRoutes, Link, useLocation } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/query-config";
import { AuthLayout } from "@/layouts";
import { Home, FolderOpen, Brain, FileText, LogIn, UserPlus, LogOut, User, Key, Settings } from "lucide-react";
import { AppRoutes } from "@/navigation/use-app-routes";
import { useAuthStore } from "@/stores/auth";

import { useAppRoutes } from "@/navigation/use-app-routes";

type CurrentRouteProps = {
  currentRoutes: RouteObject[];
};

const CurrentRoute = ({ currentRoutes }: CurrentRouteProps) => {
  const route = useRoutes(currentRoutes);
  return route;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();

  // Navigation pour utilisateurs connectés
  const authenticatedItems = [
    { name: 'Accueil', href: AppRoutes.home, icon: Home },
    { name: 'Projets', href: AppRoutes.projects, icon: FolderOpen },
    { name: 'API ManusAI', href: AppRoutes.apiDocumentation, icon: Brain },
    { name: 'Prompts', href: AppRoutes.prompts, icon: FileText },
    { name: 'Credentials IA', href: AppRoutes.aiCredentials, icon: Key },
    { name: 'Config API', href: AppRoutes.apiConfig, icon: Settings },
  ];

  // Navigation pour utilisateurs non connectés
  const publicItems = [
    { name: 'Accueil', href: AppRoutes.home, icon: Home },
    { name: 'Connexion', href: AppRoutes.login, icon: LogIn },
    { name: 'Inscription', href: AppRoutes.register, icon: UserPlus },
  ];

  const navigationItems = isAuthenticated ? authenticatedItems : publicItems;

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* Logo/Title */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">AI Bricks Analyst</h1>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                           (item.href === AppRoutes.projects && location.pathname.startsWith('/projects'));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        {isAuthenticated && (
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-gray-50 rounded-lg">
              <User className="h-4 w-4 text-gray-600" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'Utilisateur'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        )}
      </aside>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {navigationItems.find(item => 
                location.pathname === item.href || 
                (item.href === AppRoutes.projects && location.pathname.startsWith('/projects'))
              )?.name || 'Page'}
            </h2>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Connecté
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Non connecté
                </>
              )}
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 px-6 py-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

const Routes = () => {
  const { config } = useAppRoutes();

  return (
    <AuthLayout>
      <AppLayout>
        <CurrentRoute currentRoutes={[...config]} />
      </AppLayout>
    </AuthLayout>
  );
};

export const Router = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <Routes />
    </QueryClientProvider>
  </BrowserRouter>
);
