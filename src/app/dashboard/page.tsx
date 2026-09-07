'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Transaction, Category, formatarKz } from '@/lib/types';
import ChartPizza from '@/components/ChartPizza';
import ChartLinha from '@/components/ChartLinha';
import ChartBarras from '@/components/ChartBarras';
import {
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
  PiggyBank,
  AlertTriangle,
  BellRing,
  X,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardConteudo />
    </ProtectedRoute>
  );
}

function DashboardConteudo() {
  const { user, profile } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transacoes, setTransacoes] = useState<Transaction[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [lembreteVisivel, setLembreteVisivel] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: w }, { data: t }, { data: c }] = await Promise.all([
        supabase.from('wallets').select('*').order('created_at'),
        supabase.from('transactions').select('*').order('data', { ascending: false }),
        supabase.from('categories').select('*'),
      ]);
      setWallets((w as Wallet[]) || []);
      setTransacoes((t as Transaction[]) || []);
      setCategorias((c as Category[]) || []);
      setCarregando(false);
    })();
  }, [user]);

  // Lembrete diário: se já passa das 17h e o utilizador ainda não
  // lançou nenhuma transação hoje, sugere fazê-lo (só uma vez por dia)
  useEffect(() => {
    if (carregando) return;
    const hojeStr = new Date().toISOString().slice(0, 10);
    const chaveDispensado = `finjm-lembrete-dispensado-${hojeStr}`;
    if (localStorage.getItem(chaveDispensado)) return;
    if (new Date().getHours() < 17) return;
    const jaLancouHoje = transacoes.some((t) => t.data === hojeStr);
    if (!jaLancouHoje) setLembreteVisivel(true);
  }, [carregando, transacoes]);

  const dispensarLembrete = () => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`finjm-lembrete-dispensado-${hojeStr}`, '1');
    setLembreteVisivel(false);
  };

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // Transferências entre carteiras próprias não contam como gasto/receita real
  const transacoesReais = useMemo(
    () => transacoes.filter((t) => !t.eh_transferencia),
    [transacoes]
  );

  const transacoesMes = useMemo(
    () =>
      transacoesReais.filter((t) => {
        const d = new Date(t.data);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      }),
    [transacoesReais, mesAtual, anoAtual]
  );

  const saldoPorCarteira = useMemo(() => {
    return wallets.map((w) => {
      const trans = transacoes.filter((t) => t.wallet_id === w.id);
      const entradas = trans.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0);
      const saidas = trans.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0);
      return { ...w, saldo: Number(w.saldo_inicial) + entradas - saidas };
    });
  }, [wallets, transacoes]);

  const saldoTotal = useMemo(
    () => saldoPorCarteira.reduce((s, w) => s + w.saldo, 0),
    [saldoPorCarteira]
  );

  const gastosMes = useMemo(
    () => transacoesMes.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0),
    [transacoesMes]
  );

  const receitasMes = useMemo(
    () => transacoesMes.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0),
    [transacoesMes]
  );

  // Gráfico de pizza: gastos do mês por categoria
  const pizza = useMemo(() => {
    const mapa = new Map<string, number>();
    transacoesMes
      .filter((t) => t.tipo === 'saida')
      .forEach((t) => {
        const nome = categorias.find((c) => c.id === t.category_id)?.nome || 'Sem categoria';
        mapa.set(nome, (mapa.get(nome) || 0) + Number(t.valor));
      });
    const labels = Array.from(mapa.keys());
    const valores = Array.from(mapa.values());
    const cores = labels.map((nome) => {
      const cat = categorias.find((c) => c.nome === nome);
      return cat?.cor || '#6B7280';
    });
    return { labels, valores, cores };
  }, [transacoesMes, categorias]);

  const ultimosMeses = useMemo(() => {
    const meses: { label: string; ano: number; mes: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      meses.push({
        label: d.toLocaleDateString('pt-PT', { month: 'short' }),
        ano: d.getFullYear(),
        mes: d.getMonth(),
      });
    }
    return meses;
  }, [mesAtual, anoAtual]);

  // Gráfico de linha: evolução do saldo acumulado nos últimos 6 meses
  const linha = useMemo(() => {
    const saldoInicialTotal = wallets.reduce((s, w) => s + Number(w.saldo_inicial), 0);
    let acumulado = saldoInicialTotal;
    const valores: number[] = [];
    ultimosMeses.forEach(({ ano, mes }) => {
      const doMes = transacoes.filter((t) => {
        const d = new Date(t.data);
        return d.getFullYear() === ano && d.getMonth() === mes;
      });
      const entradas = doMes.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0);
      const saidas = doMes.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0);
      acumulado += entradas - saidas;
      valores.push(Number(acumulado.toFixed(2)));
    });
    return { labels: ultimosMeses.map((m) => m.label), valores };
  }, [transacoes, wallets, ultimosMeses]);

  // Gráfico de barras: receitas x despesas reais por mês (sem transferências)
  const barras = useMemo(() => {
    const receitas: number[] = [];
    const despesas: number[] = [];
    ultimosMeses.forEach(({ ano, mes }) => {
      const doMes = transacoesReais.filter((t) => {
        const d = new Date(t.data);
        return d.getFullYear() === ano && d.getMonth() === mes;
      });
      receitas.push(
        Number(doMes.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0).toFixed(2))
      );
      despesas.push(
        Number(doMes.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0).toFixed(2))
      );
    });
    return { labels: ultimosMeses.map((m) => m.label), receitas, despesas };
  }, [transacoesReais, ultimosMeses]);

  if (carregando) {
    return <p className="text-center text-gray-400 py-10">A carregar...</p>;
  }

  const limite = profile?.limite_gasto_mensal;
  const percentualLimite = limite ? Math.min(100, (gastosMes / limite) * 100) : 0;
  const mostrarAlerta = limite != null && limite > 0 && percentualLimite >= 80;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>

      {lembreteVisivel && (
        <Card className="border-azul-200 bg-azul-50 dark:border-azul-900 dark:bg-azul-900/20">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <BellRing className="text-azul-500" size={20} />
              <p className="text-sm text-gray-700 dark:text-gray-200">
                Ainda não lançou nenhuma transação hoje. Quer registar os gastos do dia?
              </p>
            </div>
            <button onClick={dispensarLembrete} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </CardContent>
        </Card>
      )}

      {mostrarAlerta && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle
              className={percentualLimite >= 100 ? 'text-red-500' : 'text-amber-500'}
              size={22}
            />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {percentualLimite >= 100
                  ? 'Limite de gastos mensal ultrapassado!'
                  : 'Está a aproximar-se do limite de gastos mensal.'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Já gastou {formatarKz(gastosMes)} de {formatarKz(limite!)} ({percentualLimite.toFixed(0)}%)
                definidos no seu perfil.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Indicador
          icone={PiggyBank}
          titulo="Saldo Total"
          valor={formatarKz(saldoTotal)}
          cor="verde"
        />
        <Indicador
          icone={TrendingUp}
          titulo="Receitas do Mês"
          valor={formatarKz(receitasMes)}
          cor="azul"
        />
        <Indicador
          icone={TrendingDown}
          titulo="Gastos do Mês"
          valor={formatarKz(gastosMes)}
          cor="vermelho"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo por Carteira</CardTitle>
        </CardHeader>
        <CardContent>
          {saldoPorCarteira.length === 0 ? (
            <p className="text-sm text-gray-400">
              Ainda não tem carteiras. Crie a sua primeira em &quot;Carteiras&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {saldoPorCarteira.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <WalletIcon size={16} className="text-azul-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {w.nome}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {formatarKz(w.saldo)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gastos do Mês por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartPizza labels={pizza.labels} valores={pizza.valores} cores={pizza.cores} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução do Saldo (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartLinha labels={linha.labels} valores={linha.valores} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receitas x Despesas por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartBarras labels={barras.labels} receitas={barras.receitas} despesas={barras.despesas} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Indicador({
  icone: Icone,
  titulo,
  valor,
  cor,
}: {
  icone: any;
  titulo: string;
  valor: string;
  cor: 'verde' | 'azul' | 'vermelho';
}) {
  const cores = {
    verde: 'bg-verde-50 text-verde-600 dark:bg-verde-900/30 dark:text-verde-400',
    azul: 'bg-azul-50 text-azul-600 dark:bg-azul-900/30 dark:text-azul-400',
    vermelho: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <div className={`rounded-xl p-3 ${cores[cor]}`}>
          <Icone size={20} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{titulo}</p>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{valor}</p>
        </div>
      </CardContent>
    </Card>
  );
}
