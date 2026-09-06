'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default function RegistoPage() {
  const { signUp, signIn } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const { error } = await signUp(nome, email, senha);

    if (error) {
      setErro(error);
      setCarregando(false);
      return;
    }

    // Tenta iniciar sessão de imediato (funciona se a confirmação de
    // e-mail estiver desativada no projeto Supabase)
    const { error: erroLogin } = await signIn(email, senha);
    setCarregando(false);

    if (erroLogin) {
      setSucesso(true);
      return;
    }
    router.replace('/dashboard');
  };

  if (sucesso) {
    return (
      <div className="mx-auto max-w-sm py-16 text-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          Conta criada com sucesso!
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Verifique o seu e-mail para confirmar a conta (se a confirmação
          estiver ativa no projeto) e depois faça login.
        </p>
        <Link href="/login">
          <Button className="mt-6">Ir para o login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Criar conta grátis
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Comece no plano FREE. Torne-se PRO quando quiser.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="O seu nome"
              />
            </div>
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
                minLength={6}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {erro && <p className="text-sm text-red-500">{erro}</p>}

            <Button type="submit" disabled={carregando} className="mt-2">
              {carregando ? 'A criar conta...' : 'Criar conta'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-verde-600">
          Entrar
        </Link>
      </p>
    </div>
  );
}
