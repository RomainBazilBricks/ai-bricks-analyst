import { PromptsPage } from './prompts';
import { MainLayout, AuthLayout } from '@/layouts';

export const PromptsPageWithLayout = () => {
  return (
    <AuthLayout>
      <MainLayout>
        <PromptsPage />
      </MainLayout>
    </AuthLayout>
  );
}; 