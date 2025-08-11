import { LoginPage } from './login';
import { MainLayout } from '@/layouts';

export const LoginPageWithLayout = () => {
  return (
    <MainLayout>
      <LoginPage />
    </MainLayout>
  );
}; 