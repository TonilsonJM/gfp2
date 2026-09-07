'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ModalTornarPro from '@/components/ModalTornarPro';
import PushManager from '@/components/PushManager';
import { REGEX_USERNAME, normalizarUsername } from '@/lib/types';
import { Crown, Mail, ShieldCheck, AlertTriangle, Check, AtSign } from 'lucide-react';

export default function PerfilPage() {
  return (
    <ProtectedRoute>
      <PerfilConteudo />
    </ProtectedRoute>
  );
}

function PerfilConteudo() {
  const { profile, isPro, isAdmin, refreshProfile } = useAuth();
  const [modalProAberto, setModalProAberto] = useState(false);
  const [limite, setLimite] = useState(
    profile?.limite_gasto_mensal != null ? String(profile.limite_gasto_mensal) : ''
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const [username, setUsername] = useState(profile?.username || '');
  const [erroUsername, setErroUsername] = useState<string | null>(null);
  const [salvandoUsername, setSalvandoUsername] = useState(false);
  const [usernameSalvo, setUsernameSalvo] = useState(false);

  if (!profile) return null;

  const salvarUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroUsername(null);
    if (!REGEX_USERNAME.test(username)) {
      setErroUsername('Use só minúsculas, números e "_" (3 a 20 caracteres).');
      return;
    }
    setSalvandoUsername(true);
    const { error } = await supabase.from('profiles').update({ username }).eq('id', profile.id);
    setSalvandoUsername(false);
    if (error) {
      setErroUsername(
        error.message.includes('duplicate') || error.message.includes('unique')
          ? 'Este nome de utilizador já está em uso.'
          : error.message
      );
      return;
    }
    await refreshProfile();
    setUsernameSalvo(true);
    setTimeout(() => setUsernameSalvo(false), 2500);
  };

  const salvarLimite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    await supabase
      .from('profiles')
      .update({ limite_gasto_mensal: limite ? Number(limite) : null })
      .eq('id', profile.id);
    await refreshProfile();
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  };

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
            <AtSign size={14} /> {profile.username}
          </p>
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
              Obrigado por ser PRO! Aproveita todos os recursos ilimitados do Fin JM.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nome de Utilizador</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use-o para entrar na sua conta em vez do e-mail, e para que
            outras pessoas o encontrem ao convidá-lo para uma carteira em grupo.
          </p>
          <form onSubmit={salvarUsername} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="username">Nome de utilizador</Label>
              <Input
                id="username"
                minLength={3}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(normalizarUsername(e.target.value))}
              />
            </div>
            {erroUsername && <p className="text-sm text-red-500">{erroUsername}</p>}
            <Button type="submit" variant="secondary" disabled={salvandoUsername}>
              {salvandoUsername ? 'A guardar...' : usernameSalvo ? (
                <>
                  <Check size={16} /> Guardado
                </>
              ) : (
                <>
                  <AtSign size={16} /> Guardar utilizador
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ative para receber avisos no telemóvel quando estiver perto do
            limite de orçamento definido abaixo, mesmo com a app fechada.
          </p>
          <PushManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerta de Orçamento Mensal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Defina um limite de gastos mensais (somando todas as carteiras). O
            Dashboard vai avisar quando estiver perto de ultrapassar o valor.
          </p>
          <form onSubmit={salvarLimite} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="limite">Limite mensal (Kz) — deixe vazio para desativar</Label>
              <Input
                id="limite"
                type="number"
                step="0.01"
                min="0"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
                placeholder="Ex: 150000"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={salvando}>
              {salvando ? 'A guardar...' : salvo ? (
                <>
                  <Check size={16} /> Guardado
                </>
              ) : (
                <>
                  <AlertTriangle size={16} /> Guardar limite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ModalTornarPro aberto={modalProAberto} aoFechar={() => setModalProAberto(false)} />
    </div>
  );
}
