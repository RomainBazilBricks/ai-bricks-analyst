import { MainLayout, AuthLayout } from '@/layouts';
import { ProjectsPage } from './projects';

export const ProjectsPageWithLayout = () => {
  return (
    <AuthLayout>
      <MainLayout>
        <ProjectsPage />
      </MainLayout>
    </AuthLayout>
  );
}; 