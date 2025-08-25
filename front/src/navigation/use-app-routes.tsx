import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ProjectsPage } from "@/pages/projects";
import { ProjectDetailPage } from "@/pages/project-detail";
import { ApiDocumentationPage } from "@/pages/api-documentation";
import { PromptsPage } from "@/pages/prompts";
import { AiCredentialsPage } from "@/pages/ai-credentials";
import { ApiConfigPage } from "@/pages/api-config";
import { OpenRouterTestPage } from "@/pages/openrouter-test";
import { ProtectedRoute } from "@/components/protected-route";


export enum AppRoutes {
    home = '/',
    projects = '/projects',
    projectDetail = '/projects/:projectUniqueId',
    apiDocumentation = '/api',
    prompts = '/prompts',
    aiCredentials = '/ai-credentials',
    apiConfig = '/api-config',
    openRouterTest = '/openrouter-test',
    login = '/login',
    register = '/register',
}

export enum ProtectedRoutes {
    home = AppRoutes.home,
    projects = AppRoutes.projects,
    projectDetail = AppRoutes.projectDetail,
    apiDocumentation = AppRoutes.apiDocumentation,
    prompts = AppRoutes.prompts,
    aiCredentials = AppRoutes.aiCredentials,
    apiConfig = AppRoutes.apiConfig,
    openRouterTest = AppRoutes.openRouterTest,
}

export const useAppRoutes = () => {

    return {
        config: [
            { path: AppRoutes.home, element: <ProtectedRoute><HomePage /></ProtectedRoute> },
            { path: AppRoutes.projects, element: <ProtectedRoute><ProjectsPage /></ProtectedRoute> },
            { path: AppRoutes.projectDetail, element: <ProtectedRoute><ProjectDetailPage /></ProtectedRoute> },
            { path: AppRoutes.apiDocumentation, element: <ProtectedRoute><ApiDocumentationPage /></ProtectedRoute> },
            { path: AppRoutes.prompts, element: <ProtectedRoute><PromptsPage /></ProtectedRoute> },
            { path: AppRoutes.aiCredentials, element: <ProtectedRoute><AiCredentialsPage /></ProtectedRoute> },
            { path: AppRoutes.apiConfig, element: <ProtectedRoute><ApiConfigPage /></ProtectedRoute> },
            { path: AppRoutes.openRouterTest, element: <ProtectedRoute><OpenRouterTestPage /></ProtectedRoute> },
            { path: AppRoutes.login, element: <LoginPage /> },
            { path: AppRoutes.register, element: <RegisterPage /> },
        ],
    };
}