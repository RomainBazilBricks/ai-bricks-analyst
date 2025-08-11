import { MainLayout, AuthLayout } from '@/layouts';
import { ProjectDetailPage } from './project-detail';

export const ProjectDetailPageWithLayout = () => {
  return (
    <AuthLayout>
      <MainLayout>
        <ProjectDetailPage />
      </MainLayout>
    </AuthLayout>
  );
}; 