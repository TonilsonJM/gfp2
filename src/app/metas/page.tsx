'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Goal, Wallet, formatarKz } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Target, TrendingUp } from 'lucide-react';

export default function MetasPage() {
  return (
    <ProtectedRoute>
      <MetasConteudo />
    </ProtectedRoute>
  );
}

function MetasConteudo() {
  const { user, isPro } = useAuth();
  const [metas, setMetas] = useState<Goal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [contribuicoesAplicadas, setContribuicoesAplicadas] = useState(0);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Goal | null>(null);
  const [nome, setNome] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [valorAtual, setValorAtual] = useState('0');
  const [dataLimite, setDataLimite] = useState('');
  const [walletId, setWalletId] = useState('');
  const [contribuicaoMensal, setContribuicaoMensal] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const [{ data: m }, { data: w }] = await Promise.all([
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('wallets').select('*').order('nome'),
    ]);
    setMetas((m as Goal[]) || []);
    setWallets((w as Wallet[]) || []);
    setCarregando(false);
    return (m as Goal[]) || [];
  };

  // Aplica automaticamente a contribuição mensal das metas que ainda
  // não receberam a contribuição deste mês
  const aplicarContribuicoesPendentes = async (lista: Goal[]) => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);
    let aplicadas = 0;

    for (const m of lista) {
      if (!m.contribuicao_mensal || m.contribuicao_mensal <= 0) continue;
      const ultimo = m.ultimo_mes_contribuicao ? new Date(m.ultimo_mes_contribuicao) : null;
      const jaAplicadaEsteMes =
        ultimo && ultimo.getMonth() === hoje.getMonth() && ultimo.getFullYear() === hoje.getFullYear();
      if (jaAplicadaEsteMes) continue;

      const novoValor = Math.min(Number(m.valor_alvo), Number(m.valor_atual) + Number(m.contribuicao_mensal));
      const { error } = await supabase
        .from('goals')
        .update({ valor_atual: novoValor, ultimo_mes_contribuicao: hojeStr })
        .eq('id', m.id);
      if (!error) aplicadas++;
    }

    if (aplicadas > 0) {
      setContribuicoesAplicadas(aplicadas);
      carregar();
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const lista = await carregar();
      await aplicarContribuicoesPendentes(lista);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const abrirNova = () => {
    setEditando(null);
    setNome('');
    setValorAlvo('');
    setValorAtual('0');
    setDataLimite('');
    setWalletId('');
    setContribuicaoMensal('');
    setErro(null);
    setDialogAberto(true);
  };

  const abrirEdicao = (m: Goal) => {
    setEditando(m);
    setNome(m.nome);
    setValorAlvo(String(m.valor_alvo));
    setValorAtual(String(m.valor_atual));
    setDataLimite(m.data_limite || '');
    setWalletId(m.wallet_id || '');
    setContribuicaoMensal(m.contribuicao_mensal != null ? String(m.contribuicao_mensal) : '');
    setErro(null);
    setDialogAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const payload = {
      nome,
      valor_alvo: Number(valorAlvo),
      valor_atual: Number(valorAtual),
      data_limite: dataLimite || null,
      wallet_id: walletId || null,
      contribuicao_mensal: contribuicaoMensal ? Number(contribuicaoMensal) : null,
    };

    const { error } = editando
      ? await supabase.from('goals').update(payload).eq('id', editando.id)
      : await supabase.from('goals').insert({ ...payload, user_id: user!.id });

    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setDialogAberto(false);
    carregar();
  };

  const remover = async (id: string) => {
    if (!confirm('Eliminar esta meta?')) return;
    await supabase.from('goals').delete().eq('id', id);
    carregar();
  };

  if (carregando) return <p className="text-center text-gray-400 py-10">A carregar...</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Metas Financeiras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {contribuicoesAplicadas > 0
              ? `${contribuicoesAplicadas} meta(s) receberam a contribuição automática deste mês.`
              : isPro
              ? 'Plano PRO: metas avançadas disponíveis.'
              : 'Defina os seus objetivos de poupança.'}
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus size={18} /> Nova Meta
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metas.map((m) => {
          const progresso = Math.min(100, (Number(m.valor_atual) / Number(m.valor_alvo)) * 100);
          return (
            <Card key={m.id}>
              <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-verde-50 p-2 dark:bg-verde-900/30">
                      <Target size={18} className="text-verde-600 dark:text-verde-400" />
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{m.nome}</p>
                  </div>
                  {m.contribuicao_mensal != null && m.contribuicao_mensal > 0 && (
                    <Badge variant="entrada">
                      <TrendingUp size={10} className="mr-1 inline" /> Auto
                    </Badge>
                  )}
                </div>

                <div>
                  <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-verde-500 to-azul-500"
                      style={{ width: `${progresso}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatarKz(Number(m.valor_atual))} de {formatarKz(Number(m.valor_alvo))} ({progresso.toFixed(0)}%)
                  </p>
                </div>

                {m.contribuicao_mensal != null && m.contribuicao_mensal > 0 && (
                  <p className="text-xs text-azul-600 dark:text-azul-400">
                    +{formatarKz(Number(m.contribuicao_mensal))} adicionados automaticamente todo mês
                  </p>
                )}

                {m.data_limite && (
                  <p className="text-xs text-gray-400">Prazo: {m.data_limite}</p>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => abrirEdicao(m)}>
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remover(m.id)}>
                    <Trash2 size={14} /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {metas.length === 0 && (
          <p className="col-span-full text-center text-sm text-gray-400 py-10">
            Ainda não tem metas. Clique em &quot;Nova Meta&quot; para começar.
          </p>
        )}
      </div>

      <Dialog
        aberto={dialogAberto}
        aoFechar={() => setDialogAberto(false)}
        titulo={editando ? 'Editar Meta' : 'Nova Meta'}
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="nome">Nome da Meta</Label>
            <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Fundo de emergência" />
          </div>
          <div>
            <Label htmlFor="valorAlvo">Valor Alvo (Kz)</Label>
            <Input id="valorAlvo" type="number" step="0.01" required value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="valorAtual">Valor Atual (Kz)</Label>
            <Input id="valorAtual" type="number" step="0.01" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contribuicaoMensal">Contribuição automática mensal (Kz, opcional)</Label>
            <Input
              id="contribuicaoMensal"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 5000 — a app soma sozinha todo mês"
              value={contribuicaoMensal}
              onChange={(e) => setContribuicaoMensal(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="carteira">Carteira associada (opcional)</Label>
            <Select id="carteira" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
              <option value="">Nenhuma</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.nome}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="dataLimite">Data Limite (opcional)</Label>
            <Input id="dataLimite" type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} />
          </div>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <Button type="submit" disabled={salvando}>
            {salvando ? 'A guardar...' : 'Guardar'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
