'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ModalTornarPro from '@/components/ModalTornarPro';
import { Crown, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';

export default function PerfilPage() {
  return (
    <ProtectedRoute>
      <PerfilConteudo />
    </ProtectedRoute>
  );
}

function PerfilConteudo() {
  const { profile, isPro, isAdmin } = useAuth();
  const [modalProAberto, setModalProAberto] = useState(false);

  if (!profile) return null;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Meu Perfil</h1>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-verde-500 to-azul-500 text-2xl font-bold text-white">
            {profile.nome.charAt(0).toUpperCase()}
          </div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{profile.nome}</p>
          <p className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Mail size={14} /> {profile.email}
          </p>
          {isAdmin && (
            <Badge variant="default">
              <ShieldCheck size={12} className="mr-1 inline" /> Super Admin
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plano Atual</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown size={18} className={isPro ? 'text-amber-500' : 'text-gray-400'} />
              <span className="font-medium text-gray-700 dark:text-gray-200">
                Plano Atual: {profile.plano}
              </span>
            </div>
            <Badge variant={isPro ? 'pro' : 'free'}>{profile.plano}</Badge>
          </div>

          {!isPro && (
            <>
              <ul className="list-disc pl-5 text-sm text-gray-500 dark:text-gray-400">
                <li>Carteiras ilimitadas</li>
                <li>Transações ilimitadas</li>
                <li>Exportação em PDF e Excel</li>
                <li>Metas avançadas e gráficos avançados</li>
                <li>Suporte prioritário</li>
              </ul>
              <Button onClick={() => setModalProAberto(true)}>
                <Crown size={16} /> Tornar-se PRO
              </Button>
            </>
          )}

          {isPro && (
            <p className="text-sm text-verde-600">
              Obrigado por ser PRO! Aproveita todos os recursos ilimitados do GFP.
            </p>
          )}
        </CardContent>
      </Card>

      <ModalTornarPro aberto={modalProAberto} aoFechar={() => setModalProAberto(false)} />
    </div>
  );
}
