import { Transaction, Wallet, Category, formatarKz } from './types';

export function exportarJSON(dados: unknown, nomeFicheiro = 'gfp-dados.json') {
  const blob = new Blob([JSON.stringify(dados, null, 2)], {
    type: 'application/json',
  });
  baixarBlob(blob, nomeFicheiro);
}

export async function exportarExcel(
  transacoes: Transaction[],
  wallets: Wallet[],
  categories: Category[],
  nomeFicheiro = 'gfp-transacoes.xlsx'
) {
  const XLSX = await import('xlsx');

  const linhas = transacoes.map((t) => ({
    Data: t.data,
    Tipo: t.tipo === 'entrada' ? 'Entrada' : 'Saída',
    Valor_Kz: t.valor,
    Carteira: wallets.find((w) => w.id === t.wallet_id)?.nome || '',
    Categoria: categories.find((c) => c.id === t.category_id)?.nome || '',
    Descricao: t.descricao || '',
  }));

  const folha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, folha, 'Transações');
  XLSX.writeFile(livro, nomeFicheiro);
}

export async function exportarPDF(
  transacoes: Transaction[],
  wallets: Wallet[],
  categories: Category[],
  nomeFicheiro = 'gfp-relatorio.pdf'
) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('GFP - Gestão Financeira Pessoal', 14, 18);
  doc.setFontSize(10);
  doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-PT')}`, 14, 25);

  const linhas = transacoes.map((t) => [
    t.data,
    t.tipo === 'entrada' ? 'Entrada' : 'Saída',
    formatarKz(t.valor),
    wallets.find((w) => w.id === t.wallet_id)?.nome || '',
    categories.find((c) => c.id === t.category_id)?.nome || '',
    t.descricao || '',
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['Data', 'Tipo', 'Valor', 'Carteira', 'Categoria', 'Descrição']],
    body: linhas,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  });

  doc.save(nomeFicheiro);
}

function baixarBlob(blob: Blob, nomeFicheiro: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFicheiro;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
