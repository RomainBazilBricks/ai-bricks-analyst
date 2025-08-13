import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ProjectsPage } from "@/pages/projects";
import { ProjectDetailPage } from "@/pages/project-detail";
import { ApiDocumentationPage } from "@/pages/api-documentation";
import { PromptsPage } from "@/pages/prompts";
import { AiCredentialsPage } from "@/pages/ai-credentials";
import { ApiConfigPage } from "@/pages/api-config";


export enum AppRoutes {
    home = '/',
    projects = '/projects',
    projectDetail = '/projects/:projectUniqueId',
    apiDocumentation = '/api',
    prompts = '/prompts',
    aiCredentials = '/ai-credentials',
    apiConfig = '/api-config',
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
}

export const useAppRoutes = () => {

    return {
        config: [
            { path: AppRoutes.home, element: <HomePage /> },
            { path: AppRoutes.projects, element: <ProjectsPage /> },
            { path: AppRoutes.projectDetail, element: <ProjectDetailPage /> },
            { path: AppRoutes.apiDocumentation, element: <ApiDocumentationPage /> },
            { path: AppRoutes.prompts, element: <PromptsPage /> },
            { path: AppRoutes.aiCredentials, element: <AiCredentialsPage /> },
            { path: AppRoutes.apiConfig, element: <ApiConfigPage /> },
            { path: AppRoutes.login, element: <LoginPage /> },
            { path: AppRoutes.register, element: <RegisterPage /> },
        ],
    };
}