export type Plano = 'FREE' | 'PRO';
export type TipoLancamento = 'entrada' | 'saida';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  plano: Plano;
  is_admin: boolean;
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
  created_at: string;
  updated_at: string;
}

export const LIMITES_FREE = {
  MAX_CARTEIRAS: 2,
  MAX_TRANSACOES_MES: 100,
};

export function formatarKz(valor: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2,
  })
    .format(valor)
    .replace('AOA', 'Kz');
}
