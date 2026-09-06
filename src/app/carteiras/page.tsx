'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Wallet, Transaction, formatarKz, LIMITES_FREE } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ModalTornarPro from '@/components/ModalTornarPro';
import { Plus, Pencil, Trash2, Wallet as WalletIcon } from 'lucide-react';

export default function CarteirasPage() {
  return (
    <ProtectedRoute>
      <CarteirasConteudo />
    </ProtectedRoute>
  );
}

function CarteirasConteudo() {
  const { user, isPro } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [modalProAberto, setModalProAberto] = useState(false);
  const [editando, setEditando] = useState<Wallet | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('0');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from('wallets').select('*').order('created_at'),
      supabase.from('transactions').select('*'),
    ]);
    setWallets((w as Wallet[]) || []);
    setTransacoes((t as Transaction[]) || []);
    setCarregando(false);
  };

  useEffect(() => {
    if (user) carregar();
  }, [user]);

  const saldoCarteira = (id: string, saldoInicial: number) => {
    const trans = transacoes.filter((t) => t.wallet_id === id);
    const entradas = trans.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0);
    const saidas = trans.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0);
    return saldoInicial + entradas - saidas;
  };

  const abrirNova = () => {
    if (!isPro && wallets.length >= LIMITES_FREE.MAX_CARTEIRAS) {
      setModalProAberto(true);
      return;
    }
    setEditando(null);
    setNome('');
    setDescricao('');
    setSaldoInicial('0');
    setErro(null);
    setDialogAberto(true);
  };

  const abrirEdicao = (w: Wallet) => {
    setEditando(w);
    setNome(w.nome);
    setDescricao(w.descricao || '');
    setSaldoInicial(String(w.saldo_inicial));
    setErro(null);
    setDialogAberto(true);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    if (editando) {
      const { error } = await supabase
        .from('wallets')
        .update({ nome, descricao, saldo_inicial: Number(saldoInicial) })
        .eq('id', editando.id);
      if (error) setErro(error.message);
    } else {
      const { error } = await supabase.from('wallets').insert({
        user_id: user!.id,
        nome,
        descricao,
        saldo_inicial: Number(saldoInicial),
      });
      if (error) {
        if (error.message.includes('LIMITE_FREE_CARTEIRAS')) {
          setDialogAberto(false);
          setModalProAberto(true);
          setSalvando(false);
          return;
        }
        setErro(error.message);
      }
    }

    setSalvando(false);
    if (!erro) {
      setDialogAberto(false);
      carregar();
    }
  };

  const remover = async (id: string) => {
    if (!confirm('Tem certeza que deseja eliminar esta carteira? As transações associadas também serão eliminadas.')) return;
    await supabase.from('wallets').delete().eq('id', id);
    carregar();
  };

  if (carregando) return <p className="text-center text-gray-400 py-10">A carregar...</p>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Carteiras</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isPro
              ? 'Plano PRO: carteiras ilimitadas.'
              : `Plano FREE: ${wallets.length}/${LIMITES_FREE.MAX_CARTEIRAS} carteiras usadas.`}
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus size={18} /> Nova Carteira
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => {
          const saldo = saldoCarteira(w.id, Number(w.saldo_inicial));
          return (
            <Card key={w.id}>
              <CardContent className="flex flex-col gap-3 py-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-azul-50 p-2 dark:bg-azul-900/30">
                      <WalletIcon size={18} className="text-azul-600 dark:text-azul-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{w.nome}</p>
                      {w.descricao && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{w.descricao}</p>
                      )}
                    </div>
                  </div>
                </div>
                <p
                  className={`text-xl font-bold ${
                    saldo >= 0 ? 'text-verde-600' : 'text-red-500'
                  }`}
                >
                  {formatarKz(saldo)}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => abrirEdicao(w)}>
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remover(w.id)}>
                    <Trash2 size={14} /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {wallets.length === 0 && (
          <p className="col-span-full text-center text-sm text-gray-400 py-10">
            Ainda não tem carteiras. Clique em &quot;Nova Carteira&quot; para começar.
          </p>
        )}
      </div>

      <Dialog
        aberto={dialogAberto}
        aoFechar={() => setDialogAberto(false)}
        titulo={editando ? 'Editar Carteira' : 'Nova Carteira'}
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Salário, Caixa Família..."
            />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Conta usada em conjunto com a família"
            />
          </div>
          <div>
            <Label htmlFor="saldo">Saldo Inicial (Kz)</Label>
            <Input
              id="saldo"
              type="number"
              step="0.01"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
            />
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
