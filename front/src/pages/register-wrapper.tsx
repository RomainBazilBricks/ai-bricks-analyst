import { RegisterPage } from './register';
import { MainLayout } from '@/layouts';

export const RegisterPageWithLayout = () => {
  return (
    <MainLayout>
      <RegisterPage />
    </MainLayout>
  );
}; 