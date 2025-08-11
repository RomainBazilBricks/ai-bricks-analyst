import { HomePage } from './home';
import { MainLayout, AuthLayout } from '@/layouts';

export const HomePageWithLayout = () => {
  return (
    <AuthLayout>
      <MainLayout>
        <HomePage />
      </MainLayout>
    </AuthLayout>
  );
}; 