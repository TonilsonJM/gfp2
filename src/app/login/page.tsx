'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await signIn(email, senha);
    setCarregando(false);
    if (error) {
      setErro(error);
      return;
    }
    router.replace('/dashboard');
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Entrar no GFP
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Acesse a sua gestão financeira de qualquer dispositivo.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {erro && <p className="text-sm text-red-500">{erro}</p>}

            <Button type="submit" disabled={carregando} className="mt-2">
              {carregando ? 'A entrar...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Ainda não tem conta?{' '}
        <Link href="/registo" className="font-semibold text-verde-600">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}
