'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, PieChart, Target, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || user) return null;

  return (
    <div className="flex flex-col items-center gap-12 py-10 text-center">
      <div className="max-w-2xl">
        <span className="mb-4 inline-block rounded-full bg-gradient-to-r from-verde-500 to-azul-500 px-4 py-1 text-xs font-semibold text-white">
          FJM
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
          Fin JM
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          Organize as suas carteiras, controle entradas e saídas, defina metas
          e acompanhe tudo em gráficos simples — sozinho ou em grupo (família,
          equipa, negócio).
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/registo">
            <Button size="lg">Criar conta grátis</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Já tenho conta
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Recurso icone={Wallet} titulo="Carteiras" texto="Individuais ou em grupo" />
        <Recurso icone={PieChart} titulo="Gráficos" texto="Pizza e evolução do saldo" />
        <Recurso icone={Target} titulo="Metas" texto="Acompanhe os seus objetivos" />
        <Recurso icone={ShieldCheck} titulo="Seguro" texto="Dados isolados por conta" />
      </div>
    </div>
  );
}

function Recurso({
  icone: Icone,
  titulo,
  texto,
}: {
  icone: any;
  titulo: string;
  texto: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-6">
        <div className="rounded-full bg-verde-50 p-3 dark:bg-verde-900/30">
          <Icone className="text-verde-600 dark:text-verde-400" size={22} />
        </div>
        <p className="font-semibold text-gray-800 dark:text-gray-100">{titulo}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{texto}</p>
      </CardContent>
    </Card>
  );
}
