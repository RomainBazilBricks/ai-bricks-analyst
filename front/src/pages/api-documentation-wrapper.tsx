import { ApiDocumentationPage } from './api-documentation';
import { MainLayout, AuthLayout } from '@/layouts';

export const ApiDocumentationPageWithLayout = () => {
  return (
    <AuthLayout>
      <MainLayout>
        <ApiDocumentationPage />
      </MainLayout>
    </AuthLayout>
  );
}; 