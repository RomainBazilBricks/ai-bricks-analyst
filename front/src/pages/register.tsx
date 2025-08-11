import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '@/api/auth';

export const RegisterPage = () => {
    const loginStore = useAuthStore((s) => s.login);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { mutateAsync, isPending, isError, error } = useRegister();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const data = await mutateAsync({ name, email, password });
        loginStore(data.user, data.token)
    };

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded bg-white">
                <h1 className="text-2xl font-bold mb-4">Créer un compte</h1>
                <Input
                    type="text"
                    placeholder="Nom"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
                <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
                <Input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                {isError && <div className="text-red-500 text-sm">{(error as any)?.response?.data?.error || 'Erreur inconnue'}</div>}
                <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? 'Création...' : 'Créer le compte'}
                </Button>
            </form>
            <div className="mt-4 text-center">
                <span>Déjà un compte ? </span>
                <Link to="/login" className="text-blue-600 hover:underline">Se connecter</Link>
            </div>
        </div>
    );
}; 