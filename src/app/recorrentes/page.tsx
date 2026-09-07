'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Wallet, Category, RecurringTransaction, formatarKz } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pencil, Repeat, Check, Pause } from 'lucide-react';

export default function RecorrentesPage() {
  return (
    <ProtectedRoute>
      <RecorrentesConteudo />
    </ProtectedRoute>
  );
}

function RecorrentesConteudo() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [recorrentes, setRecorrentes] = useState<RecurringTransaction[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [lancadasAgora, setLancadasAgora] = useState(0);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<RecurringTransaction | null>(null);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [diaDoMes, setDiaDoMes] = useState('1');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const [{ data: w }, { data: c }, { data: r }] = await Promise.all([
      supabase.from('wallets').select('*').order('nome'),
      supabase.from('categories').select('*').order('nome'),
      supabase.from('recurring_transactions').select('*').order('created_at', { ascending: false }),
    ]);
    setWallets((w as Wallet[]) || []);
    setCategorias((c as Category[]) || []);
    setRecorrentes((r as RecurringTransaction[]) || []);
    setCarregando(false);
    return (r as RecurringTransaction[]) || [];
  };

  // Lança automaticamente as recorrências deste mês que ainda não foram lançadas
  const processarLancamentosPendentes = async (lista: RecurringTransaction[]) => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().slice(0, 10);
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    let lancadas = 0;

    setProcessando(true);
    for (const r of lista) {
      if (!r.ativo) continue;
      const ultimo = r.ultimo_lancamento ? new Date(r.ultimo_lancamento) : null;
      const jaLancadoEsteMes =
        ultimo && ultimo.getMonth() === mesAtual && ultimo.getFullYear() === anoAtual;
      if (jaLancadoEsteMes) continue;
      if (hoje.getDate() < r.dia_do_mes) continue;

      const { error: erroInsercao } = await supabase.from('transactions').insert({
        user_id: r.user_id,
        wallet_id: r.wallet_id,
        category_id: r.category_id,
        tipo: r.tipo,
        valor: r.valor,
        data: hojeStr,
        descricao: `${r.descricao || 'Recorrente'} (lançamento automático)`,
      });

      if (!erroInsercao) {
        await supabase
          .from('recurring_transactions')
          .update({ ultimo_lancamento: hojeStr })
          .eq('id', r.id);
        lancadas++;
      }
    }
    setProcessando(false);
    setLancadasAgora(lancadas);
    if (lancadas > 0) carregar();
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const lista = await carregar();
      await processarLancamentosPendentes(lista);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const abrirNova = () => {
    if (wallets.length === 0) {
      alert('Crie primeiro uma carteira em "Carteiras".');
      return;
    }
    setEditando(null);
    setTipo('saida');
    setWalletId(wallets[0]?.id || '');
    setCategoryId('');
    setValor('');
    setDescricao('');
    setDiaDoMes('1');
    setErro(null);
    setDialogAberto(true);
  };

  const abrirEdicao = (r: RecurringTransaction) => {
    setEditando(r);
    setTipo(r.tipo);
    setWalletId(r.wallet_id);
    setCategoryId(r.category_id || '');
    setValor(String(r.valor));
    setDescricao(r.descricao || '');
    setDiaDoMes(String(r.dia_do_mes));
    setErro(null);
    setDialogAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const payload = {
      wallet_id: walletId,
      category_id: categoryId || null,
      tipo,
      valor: Number(valor),
      descricao,
      dia_do_mes: Number(diaDoMes),
    };

    const { error } = editando
      ? await supabase.from('recurring_transactions').update(payload).eq('id', editando.id)
      : await supabase.from('recurring_transactions').insert({ ...payload, user_id: user!.id });

    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setDialogAberto(false);
    carregar();
  };

  const alternarAtivo = async (r: RecurringTransaction) => {
    await supabase.from('recurring_transactions').update({ ativo: !r.ativo }).eq('id', r.id);
    carregar();
  };

  const remover = async (id: string) => {
    if (!confirm('Eliminar esta transação recorrente? Os lançamentos já feitos não serão apagados.')) return;
    await supabase.from('recurring_transactions').delete().eq('id', id);
    carregar();
  };

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

  if (carregando) return <p className="text-center text-gray-400 py-10">A carregar...</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-gray-100">
            <Repeat size={22} className="text-azul-500" /> Transações Recorrentes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {processando
              ? 'A verificar lançamentos deste mês...'
              : lancadasAgora > 0
              ? `${lancadasAgora} transação(ões) deste mês lançada(s) automaticamente.`
              : 'Salário, renda, assinaturas... lançados automaticamente todo mês.'}
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus size={18} /> Nova Recorrência
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recorrentes.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-3 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {r.descricao || 'Sem descrição'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {wallets.find((w) => w.id === r.wallet_id)?.nome || '-'} · Todo dia {r.dia_do_mes}
                  </p>
                </div>
                <Badge variant={r.ativo ? (r.tipo === 'entrada' ? 'entrada' : 'saida') : 'free'}>
                  {r.ativo ? 'Ativa' : 'Pausada'}
                </Badge>
              </div>
              <p
                className={`text-lg font-bold ${
                  r.tipo === 'entrada' ? 'text-verde-600' : 'text-red-500'
                }`}
              >
                {formatarKz(Number(r.valor))}
              </p>
              {r.ultimo_lancamento && (
                <p className="text-xs text-gray-400">Último lançamento: {r.ultimo_lancamento}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => abrirEdicao(r)}>
                  <Pencil size={14} /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => alternarAtivo(r)}>
                  {r.ativo ? <Pause size={14} /> : <Check size={14} />}
                  {r.ativo ? 'Pausar' : 'Ativar'}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remover(r.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {recorrentes.length === 0 && (
          <p className="col-span-full text-center text-sm text-gray-400 py-10">
            Ainda não tem transações recorrentes. Clique em &quot;Nova Recorrência&quot; para
            automatizar o salário, renda ou assinaturas.
          </p>
        )}
      </div>

      <Dialog
        aberto={dialogAberto}
        aoFechar={() => setDialogAberto(false)}
        titulo={editando ? 'Editar Recorrência' : 'Nova Recorrência'}
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div>
            <Label>Tipo</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tipo === 'entrada' ? 'primary' : 'outline'}
                className="flex-1"
                onClick={() => { setTipo('entrada'); setCategoryId(''); }}
              >
                Entrada
              </Button>
              <Button
                type="button"
                variant={tipo === 'saida' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => { setTipo('saida'); setCategoryId(''); }}
              >
                Saída
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Salário, Renda, Netflix..."
            />
          </div>

          <div>
            <Label htmlFor="carteira">Carteira</Label>
            <Select id="carteira" required value={walletId} onChange={(e) => setWalletId(e.target.value)}>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.nome}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="categoria">Categoria</Label>
            <Select id="categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categoriasDoTipo.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="valor">Valor (Kz)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="diaDoMes">Dia do mês em que lança (1-28)</Label>
            <Input
              id="diaDoMes"
              type="number"
              min="1"
              max="28"
              required
              value={diaDoMes}
              onChange={(e) => setDiaDoMes(e.target.value)}
            />
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
