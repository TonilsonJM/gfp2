export type Plano = 'FREE' | 'PRO';
export type TipoLancamento = 'entrada' | 'saida';
export type PapelMembro = 'editor' | 'visualizador';
export type StatusMembro = 'pendente' | 'aceite';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  username: string;
  plano: Plano;
  is_admin: boolean;
  limite_gasto_mensal: number | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  saldo_inicial: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  nome: string;
  tipo: TipoLancamento;
  cor: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  category_id: string | null;
  tipo: TipoLancamento;
  valor: number;
  data: string; // YYYY-MM-DD
  descricao: string | null;
  eh_transferencia: boolean;
  transferencia_grupo_id: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  wallet_id: string | null;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  data_limite: string | null;
  contribuicao_mensal: number | null;
  ultimo_mes_contribuicao: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletMember {
  id: string;
  wallet_id: string;
  user_id: string | null;
  convidado_email: string;
  papel: PapelMembro;
  status: StatusMembro;
  created_at: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  category_id: string | null;
  tipo: TipoLancamento;
  valor: number;
  descricao: string | null;
  dia_do_mes: number;
  ativo: boolean;
  ultimo_lancamento: string | null;
  created_at: string;
}

export interface PlanHistoryEntry {
  id: string;
  user_id: string;
  plano_anterior: Plano | null;
  plano_novo: Plano;
  alterado_por: string | null;
  created_at: string;
}

export const LIMITES_FREE = {
  MAX_CARTEIRAS: 2,
  MAX_TRANSACOES_MES: 100,
};

// Mesma regra aplicada no banco (check constraint): só minúsculas,
// números e underscore, 3 a 20 caracteres.
export const REGEX_USERNAME = /^[a-z0-9_]{3,20}$/;

export function normalizarUsername(valor: string): string {
  return valor.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function formatarKz(valor: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2,
  })
    .format(valor)
    .replace('AOA', 'Kz');
}

// Formato "YYYY-MM" do mês atual, usado para controlar se uma
// contribuição de meta ou uma transação recorrente já foi lançada
// no mês corrente.
export function mesAtualISO(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}
