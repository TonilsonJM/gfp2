// Fin JM - Edge Function: send-budget-alerts
//
// Verifica todos os utilizadores com um limite de gasto mensal definido,
// soma as despesas reais do mês atual, e envia uma notificação push a
// quem estiver a partir de 80% do limite.
//
// DEPLOY (via Supabase CLI, a partir da pasta do projeto):
//   supabase functions deploy send-budget-alerts
//
// SECRETS NECESSÁRIOS (Project Settings → Edge Functions → Secrets, ou via CLI):
//   supabase secrets set VAPID_PUBLIC_KEY=xxx VAPID_PRIVATE_KEY=xxx VAPID_SUBJECT=mailto:tonilsonjm@gmail.com
//   (gere o par de chaves uma única vez, no seu computador, com:
//    npx web-push generate-vapid-keys)
//   O VAPID_PUBLIC_KEY deve ser o MESMO valor colocado na variável de
//   ambiente NEXT_PUBLIC_VAPID_PUBLIC_KEY do frontend (Fin JM), senão as
//   subscrições dos utilizadores não vão bater com a chave privada do servidor.
//
// AGENDAMENTO (executa 1x por dia, ex: 08h00) — no SQL Editor do Supabase:
//   select cron.schedule(
//     'finjm-budget-alerts-diario',
//     '0 8 * * *',
//     $$
//     select net.http_post(
//       url := 'https://SEU-PROJETO.supabase.co/functions/v1/send-budget-alerts',
//       headers := jsonb_build_object('Authorization', 'Bearer SEU_SERVICE_ROLE_KEY')
//     );
//     $$
//   );
// (requer as extensões "pg_cron" e "pg_net" ativas em Database → Extensions)

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@example.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: perfis, error: erroPerfis } = await supabase
    .from('profiles')
    .select('id, nome, limite_gasto_mensal')
    .not('limite_gasto_mensal', 'is', null)
    .gt('limite_gasto_mensal', 0);

  if (erroPerfis) {
    return new Response(JSON.stringify({ erro: erroPerfis.message }), { status: 500 });
  }

  let notificacoesEnviadas = 0;

  for (const perfil of perfis || []) {
    const { data: transacoes } = await supabase
      .from('transactions')
      .select('valor, tipo, eh_transferencia')
      .eq('user_id', perfil.id)
      .eq('tipo', 'saida')
      .eq('eh_transferencia', false)
      .gte('data', inicioMes)
      .lte('data', fimMes);

    const gastos = (transacoes || []).reduce((s, t) => s + Number(t.valor), 0);
    const percentual = (gastos / Number(perfil.limite_gasto_mensal)) * 100;

    if (percentual < 80) continue;

    const { data: subscricoes } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', perfil.id);

    const mensagem = JSON.stringify({
      title: percentual >= 100 ? 'Limite de gastos ultrapassado' : 'Está perto do limite de gastos',
      body: `Já gastou ${gastos.toFixed(2)} Kz de ${Number(perfil.limite_gasto_mensal).toFixed(2)} Kz este mês (${percentual.toFixed(0)}%).`,
      url: '/dashboard',
    });

    for (const sub of subscricoes || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          mensagem
        );
        notificacoesEnviadas++;
      } catch (e) {
        // Subscrição expirada/inválida: remove para não tentar de novo
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, notificacoesEnviadas }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
