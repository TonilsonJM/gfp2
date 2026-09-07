'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabaseClient';
import { Profile, PlanHistoryEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ChartBarras from '@/components/ChartBarras';
import { Users, Crown, ShieldCheck, History } from 'lucide-react';

export default function AdminPage() {
  return (
    <ProtectedRoute apenasAdmin>
      <AdminConteudo />
    </ProtectedRoute>
  );
}

function AdminConteudo() {
  const [perfis, setPerfis] = useState<Profile[]>([]);
  const [historico, setHistorico] = useState<PlanHistoryEntry[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const carregar = async () => {
    const [{ data: p }, { data: h }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('plan_history').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setPerfis((p as Profile[]) || []);
    setHistorico((h as PlanHistoryEntry[]) || []);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const mudarPlano = async (id: string, novoPlano: 'FREE' | 'PRO') => {
    setAtualizandoId(id);
    const { error } = await supabase.from('profiles').update({ plano: novoPlano }).eq('id', id);
    if (error) alert('Erro ao atualizar plano: ' + error.message);
    await carregar();
    setAtualizandoId(null);
  };

  const perfisFiltrados = perfis.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.username.toLowerCase().includes(busca.toLowerCase()) ||
      p.email.toLowerCase().includes(busca.toLowerCase())
  );

  const totalUsuarios = perfis.length;
  const totalPro = perfis.filter((p) => p.plano === 'PRO').length;

  // Gráfico de crescimento: novos utilizadores por mês (últimos 6 meses)
  const crescimento = useMemo(() => {
    const hoje = new Date();
    const meses: { label: string; ano: number; mes: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push({ label: d.toLocaleDateString('pt-PT', { month: 'short' }), ano: d.getFullYear(), mes: d.getMonth() });
    }
    const novos = meses.map(({ ano, mes }) =>
      perfis.filter((p) => {
        const d = new Date(p.created_at);
        return d.getFullYear() === ano && d.getMonth() === mes;
      }).length
    );
    return { labels: meses.map((m) => m.label), novos };
  }, [perfis]);

  const nomePorId = (id: string) => perfis.find((p) => p.id === id)?.nome || id.slice(0, 8);

  if (carregando) return <p className="text-center text-gray-400 py-10">A carregar...</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-verde-600" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Painel Admin</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-azul-50 p-3 dark:bg-azul-900/30">
              <Users size={20} className="text-azul-600 dark:text-azul-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total de Utilizadores</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalUsuarios}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-900/30">
              <Crown size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Utilizadores PRO</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalPro}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crescimento de Utilizadores (6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartBarras
            labels={crescimento.labels}
            receitas={crescimento.novos}
            labelSerie1="Novos utilizadores"
            corSerie1="#3B82F6"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Utilizadores</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            placeholder="Procurar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <th className="p-2">Nome</th>
                  <th className="p-2">Utilizador</th>
                  <th className="p-2">E-mail</th>
                  <th className="p-2">Plano</th>
                  <th className="p-2">Registado em</th>
                  <th className="p-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {perfisFiltrados.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="p-2 font-medium text-gray-700 dark:text-gray-200">
                      {p.nome} {p.is_admin && <ShieldCheck size={12} className="ml-1 inline text-verde-500" />}
                    </td>
                    <td className="p-2 text-gray-500 dark:text-gray-400">@{p.username}</td>
                    <td className="p-2 text-gray-500 dark:text-gray-400">{p.email}</td>
                    <td className="p-2">
                      <Badge variant={p.plano === 'PRO' ? 'pro' : 'free'}>{p.plano}</Badge>
                    </td>
                    <td className="p-2 text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="p-2 text-right">
                      {p.plano === 'FREE' ? (
                        <Button
                          size="sm"
                          disabled={atualizandoId === p.id}
                          onClick={() => mudarPlano(p.id, 'PRO')}
                        >
                          Tornar PRO
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={atualizandoId === p.id}
                          onClick={() => mudarPlano(p.id, 'FREE')}
                        >
                          Voltar a FREE
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {perfisFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400">
                      Nenhum utilizador encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={16} /> Histórico de Mudanças de Plano
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="p-3">Data</th>
                <th className="p-3">Utilizador</th>
                <th className="p-3">De</th>
                <th className="p-3">Para</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="p-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {new Date(h.created_at).toLocaleString('pt-PT')}
                  </td>
                  <td className="p-3 font-medium text-gray-700 dark:text-gray-200">{nomePorId(h.user_id)}</td>
                  <td className="p-3">
                    <Badge variant={h.plano_anterior === 'PRO' ? 'pro' : 'free'}>
                      {h.plano_anterior || '-'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={h.plano_novo === 'PRO' ? 'pro' : 'free'}>{h.plano_novo}</Badge>
                  </td>
                </tr>
              ))}
              {historico.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-gray-400">
                    Ainda não há mudanças de plano registadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
