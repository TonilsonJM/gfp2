// Fin JM - Edge Function: monthly-report
//
// Gera um PDF com o resumo financeiro do mês anterior de cada utilizador
// PRO e envia por e-mail usando a Resend (https://resend.com — tem plano
// gratuito). Pensada para correr automaticamente no primeiro dia de cada mês.
//
// DEPLOY:
//   supabase functions deploy monthly-report
//
// SECRETS NECESSÁRIOS:
//   supabase secrets set RESEND_API_KEY=xxx RESEND_FROM="Fin JM <relatorios@seudominio.com>"
//   (crie a conta grátis em resend.com, verifique um domínio ou use o
//   domínio de testes deles enquanto avalia)
//
// AGENDAMENTO (todo dia 1 às 07h00) — no SQL Editor do Supabase:
//   select cron.schedule(
//     'finjm-relatorio-mensal',
//     '0 7 1 * *',
//     $$
//     select net.http_post(
//       url := 'https://SEU-PROJETO.supabase.co/functions/v1/monthly-report',
//       headers := jsonb_build_object('Authorization', 'Bearer SEU_SERVICE_ROLE_KEY')
//     );
//     $$
//   );
// (requer as extensões "pg_cron" e "pg_net" ativas em Database → Extensions)

import { createClient } from 'npm:@supabase/supabase-js@2';
import jsPDF from 'npm:jspdf@2';
import autoTable from 'npm:jspdf-autotable@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Fin JM <onboarding@resend.dev>';

function formatarKz(v: number) {
  return `${v.toFixed(2)} Kz`;
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const hoje = new Date();
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const inicio = mesAnterior.toISOString().slice(0, 10);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().slice(0, 10);
  const nomeMes = mesAnterior.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

  const { data: perfisPro } = await supabase.from('profiles').select('id, nome, email').eq('plano', 'PRO');

  let enviados = 0;

  for (const perfil of perfisPro || []) {
    const { data: transacoes } = await supabase
      .from('transactions')
      .select('data, tipo, valor, descricao, wallet_id, category_id, eh_transferencia')
      .eq('user_id', perfil.id)
      .eq('eh_transferencia', false)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data');

    if (!transacoes || transacoes.length === 0) continue;

    const { data: wallets } = await supabase.from('wallets').select('id, nome').eq('user_id', perfil.id);
    const { data: categorias } = await supabase.from('categories').select('id, nome');

    const receitas = transacoes.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0);
    const despesas = transacoes.filter((t) => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0);

    // ---- Gera o PDF (mesma biblioteca usada no frontend) ----
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Fin JM - Relatório Mensal', 14, 18);
    doc.setFontSize(11);
    doc.text(`Olá, ${perfil.nome}! Resumo de ${nomeMes}`, 14, 26);
    doc.setFontSize(10);
    doc.text(`Receitas: ${formatarKz(receitas)}   |   Despesas: ${formatarKz(despesas)}   |   Saldo do mês: ${formatarKz(receitas - despesas)}`, 14, 33);

    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Tipo', 'Valor', 'Carteira', 'Categoria', 'Descrição']],
      body: transacoes.map((t) => [
        t.data,
        t.tipo === 'entrada' ? 'Entrada' : 'Saída',
        formatarKz(Number(t.valor)),
        wallets?.find((w) => w.id === t.wallet_id)?.nome || '',
        categorias?.find((c) => c.id === t.category_id)?.nome || '',
        t.descricao || '',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });

    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // ---- Envia por e-mail via Resend ----
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: perfil.email,
        subject: `Fin JM - O seu relatório de ${nomeMes}`,
        html: `<p>Olá, ${perfil.nome}!</p><p>Segue em anexo o seu relatório financeiro de <strong>${nomeMes}</strong>.</p><p>Receitas: ${formatarKz(receitas)}<br/>Despesas: ${formatarKz(despesas)}<br/>Saldo do mês: ${formatarKz(receitas - despesas)}</p><p>— Fin JM</p>`,
        attachments: [
          {
            filename: `finjm-relatorio-${mesAnterior.getFullYear()}-${mesAnterior.getMonth() + 1}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (resposta.ok) enviados++;
  }

  return new Response(JSON.stringify({ ok: true, enviados }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
