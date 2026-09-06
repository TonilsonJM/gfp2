'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Wallet, Category, Transaction, formatarKz, LIMITES_FREE } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ModalTornarPro from '@/components/ModalTornarPro';
import { exportarJSON, exportarPDF, exportarExcel } from '@/lib/exportUtils';
import { Plus, Trash2, Download, FileSpreadsheet, FileText } from 'lucide-react';

export default function TransacoesPage() {
  return (
    <ProtectedRoute>
      <TransacoesConteudo />
    </ProtectedRoute>
  );
}

function TransacoesConteudo() {
  const { user, isPro } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [carregando, setCarregando] = useState(true);

  // filtros
  const [filtroCarteira, setFiltroCarteira] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  // dialog nova transação
  const [dialogAberto, setDialogAberto] = useState(false);
  const [modalProAberto, setModalProAberto] = useState(false);
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const [{ data: w }, { data: c }, { data: t }] = await Promise.all([
      supabase.from('wallets').select('*').order('nome'),
      supabase.from('categories').select('*').order('nome'),
      supabase.from('transactions').select('*').order('data', { ascending: false }),
    ]);
    setWallets((w as Wallet[]) || []);
    setCategorias((c as Category[]) || []);
    setTransacoes((t as Transaction[]) || []);
    setCarregando(false);
  };

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      if (filtroCarteira && t.wallet_id !== filtroCarteira) return false;
      if (filtroCategoria && t.category_id !== filtroCategoria) return false;
      if (filtroInicio && t.data < filtroInicio) return false;
      if (filtroFim && t.data > filtroFim) return false;
      return true;
    });
  }, [transacoes, filtroCarteira, filtroCategoria, filtroInicio, filtroFim]);

  const contagemMesAtual = useMemo(() => {
    const hoje = new Date();
    return transacoes.filter((t) => {
      const d = new Date(t.data);
      return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    }).length;
  }, [transacoes]);

  const abrirNova = () => {
    if (wallets.length === 0) {
      alert('Crie primeiro uma carteira em "Carteiras".');
      return;
    }
    if (!isPro && contagemMesAtual >= LIMITES_FREE.MAX_TRANSACOES_MES) {
      setModalProAberto(true);
      return;
    }
    setTipo('saida');
    setWalletId(wallets[0]?.id || '');
    setCategoryId('');
    setValor('');
    setData(new Date().toISOString().slice(0, 10));
    setDescricao('');
    setErro(null);
    setDialogAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from('transactions').insert({
      user_id: user!.id,
      wallet_id: walletId,
      category_id: categoryId || null,
      tipo,
      valor: Number(valor),
      data,
      descricao,
    });

    setSalvando(false);

    if (error) {
      if (error.message.includes('LIMITE_FREE_TRANSACOES')) {
        setDialogAberto(false);
        setModalProAberto(true);
        return;
      }
      setErro(error.message);
      return;
    }

    setDialogAberto(false);
    carregar();
  };

  const remover = async (id: string) => {
    if (!confirm('Eliminar esta transação?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    carregar();
  };

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

  const aoExportarJSON = () => {
    exportarJSON(transacoesFiltradas, 'gfp-transacoes.json');
  };

  const aoExportarPDF = () => {
    if (!isPro) return setModalProAberto(true);
    exportarPDF(transacoesFiltradas, wallets, categorias);
  };

  const aoExportarExcel = () => {
    if (!isPro) return setModalProAberto(true);
    exportarExcel(transacoesFiltradas, wallets, categorias);
  };

  if (carregando) return <p className="text-center text-gray-400 py-10">A carregar...</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Transações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isPro
              ? 'Plano PRO: transações ilimitadas.'
              : `Plano FREE: ${contagemMesAtual}/${LIMITES_FREE.MAX_TRANSACOES_MES} transações este mês.`}
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus size={18} /> Nova Transação
        </Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Carteira</Label>
            <Select value={filtroCarteira} onChange={(e) => setFiltroCarteira(e.target.value)}>
              <option value="">Todas</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.nome}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>De</Label>
            <Input type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={aoExportarJSON}>
          <Download size={14} /> Exportar JSON
        </Button>
        <Button size="sm" variant="outline" onClick={aoExportarPDF}>
          <FileText size={14} /> Exportar PDF {!isPro && '(PRO)'}
        </Button>
        <Button size="sm" variant="outline" onClick={aoExportarExcel}>
          <FileSpreadsheet size={14} /> Exportar Excel {!isPro && '(PRO)'}
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <th className="p-3">Data</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Carteira</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="p-3 whitespace-nowrap">{t.data}</td>
                  <td className="p-3">
                    <Badge variant={t.tipo === 'entrada' ? 'entrada' : 'saida'}>
                      {t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </Badge>
                  </td>
                  <td className="p-3">{wallets.find((w) => w.id === t.wallet_id)?.nome || '-'}</td>
                  <td className="p-3">{categorias.find((c) => c.id === t.category_id)?.nome || '-'}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">{t.descricao || '-'}</td>
                  <td
                    className={`p-3 text-right font-semibold ${
                      t.tipo === 'entrada' ? 'text-verde-600' : 'text-red-500'
                    }`}
                  >
                    {formatarKz(Number(t.valor))}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => remover(t.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {transacoesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-400">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog aberto={dialogAberto} aoFechar={() => setDialogAberto(false)} titulo="Nova Transação">
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
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" required value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          {erro && <p className="text-sm text-red-500">{erro}</p>}

          <Button type="submit" disabled={salvando}>
            {salvando ? 'A guardar...' : 'Guardar'}
          </Button>
        </form>
      </Dialog>

      <ModalTornarPro aberto={modalProAberto} aoFechar={() => setModalProAberto(false)} />
    </div>
  );
}
