# Fin JM - Gestão Financeira Pessoal

Aplicação web responsiva de gestão financeira pessoal e em grupo, instalável
como app no Android e iOS (PWA).

- **Frontend:** Next.js (App Router) + TailwindCSS, exportado como site estático → GitHub Pages
- **Backend / Banco de Dados / Autenticação:** Supabase (plano gratuito)
- **Gráficos:** Chart.js (via react-chartjs-2)
- **Moeda:** Kwanza (Kz)
- **PWA:** instalável no ecrã inicial do Android/iOS, com barra de navegação inferior estilo app nativo

---

## 1. Configurar o Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto (plano Free).
2. Vá a **SQL Editor** → cole todo o conteúdo do ficheiro `supabase/schema.sql` → **Run**.
   Isto cria todas as tabelas, funções, triggers e políticas RLS — incluindo
   partilha de carteiras, transferências, recorrências, histórico de planos
   e notificações push.
3. Vá a **Authentication → Providers** e confirme que "Email" está ativo.
   - Para testes rápidos, em **Authentication → Settings**, pode desativar
     "Confirm email" para que o login funcione imediatamente após o registo.
4. Vá a **Project Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` / `Publishable key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Ativar o Super Admin

O e-mail **tonilsonjm@gmail.com** é automaticamente marcado como Super Admin
(`is_admin = true`) assim que essa conta se **regista** na aplicação (o
trigger `handle_new_user` trata disso).

Se essa conta já existir e não estiver marcada como admin, corrija manualmente
no **SQL Editor**:

```sql
update public.profiles set is_admin = true where email = 'tonilsonjm@gmail.com';
```

### Já tinha o projeto criado antes desta atualização?

Rode os scripts de migração no SQL Editor, na ordem, conforme o que já tiver
corrido antes:

- `supabase/migration_v2.sql` — adiciona `limite_gasto_mensal` (se ainda não tiver corrido)
- `supabase/migration_v3.sql` — adiciona partilha de carteiras, transferências,
  transações recorrentes, contribuição automática de metas, histórico de
  planos e notificações push
- `supabase/migration_v4.sql` — adiciona nome de utilizador único (login e
  convites por username)

Nenhum dos dois apaga dados existentes.

---

## 2. Configurar o projeto localmente

```bash
cd gfp-app
cp .env.example .env.local
# edite .env.local com os dados do seu projeto Supabase

npm install
npm run dev
```

Aceda a `http://localhost:3000`.

> **Nota sobre a versão do Next.js:** o `package.json` está configurado para
> Next.js 16. Se o `npm install` falhar por essa versão ainda não estar
> disponível no seu ambiente, altere a linha `"next": "^16.0.0"` para
> `"next": "^15.0.0"` no `package.json` — o código é 100% compatível com
> ambas as versões (App Router).

---

## 3. Deploy do Frontend no GitHub Pages

1. Crie um repositório no GitHub e envie este projeto:
   ```bash
   git init
   git add .
   git commit -m "Fin JM - Gestão Financeira Pessoal"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```
2. No GitHub, vá a **Settings → Pages** → em "Source" escolha **GitHub Actions**.
3. Vá a **Settings → Secrets and variables → Actions** e adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (opcional — só se for usar notificações push, ver seção 8)
4. Faça push para `main` — o workflow `.github/workflows/deploy.yml` já incluído
   faz o build (`next build` com `output: export`) e publica automaticamente
   em `https://SEU-USUARIO.github.io/SEU-REPO/`.

### Deploy alternativo: Vercel

Se preferir, basta importar o repositório em [vercel.com](https://vercel.com),
definir as mesmas variáveis de ambiente no painel do projeto, e o deploy é
automático a cada push.

---

## 4. Estrutura de pastas

```
gfp-app/
├── .github/workflows/deploy.yml   # Deploy automático no GitHub Pages
├── public/
│   ├── manifest.json              # PWA (instalação no Android/iOS)
│   ├── sw.js                      # Service worker (push + PWA)
│   └── icon-*.png                 # Ícones do app
├── supabase/
│   ├── schema.sql                 # Schema completo (instalação nova)
│   ├── migration_v2.sql           # Migração: limite de orçamento
│   ├── migration_v3.sql           # Migração: partilha, transferências, recorrências, etc.
│   ├── migration_v4.sql           # Migração: nome de utilizador único
│   └── functions/
│       ├── send-budget-alerts/    # Edge Function: push de orçamento (ver seção 8)
│       └── monthly-report/        # Edge Function: relatório PDF por e-mail (ver seção 9)
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Layout raiz (Navbar, BottomNav, PWA meta)
│   │   ├── page.tsx               # Landing page
│   │   ├── login/page.tsx
│   │   ├── registo/page.tsx
│   │   ├── dashboard/page.tsx     # Saldos + gráficos + alerta de orçamento + lembrete diário
│   │   ├── carteiras/page.tsx     # CRUD + partilha de carteiras (convidar membros)
│   │   ├── transacoes/page.tsx    # CRUD + edição + busca + filtros + transferências + exportação
│   │   ├── recorrentes/page.tsx   # Transações recorrentes (lançamento automático mensal)
│   │   ├── metas/page.tsx         # CRUD de metas + contribuição automática mensal
│   │   ├── perfil/page.tsx        # Plano atual + notificações + limite de orçamento + Tornar-se PRO
│   │   └── admin/page.tsx         # Painel Admin + crescimento de utilizadores + histórico de planos
│   ├── components/                # Navbar, BottomNav, PushManager, gráficos, ui/...
│   ├── context/AuthContext.tsx    # Sessão, perfil, isPro, isAdmin, aceita convites pendentes
│   └── lib/                       # supabaseClient, types, exportUtils, push, utils
├── package.json
├── next.config.mjs                # output: 'export' (GitHub Pages)
├── tailwind.config.ts
└── tsconfig.json
```

---

## 5. Instalar como app no Android (PWA)

O projeto já inclui `public/manifest.json` e ícones prontos. Depois de
publicado (GitHub Pages ou Vercel):

1. Abra o site no Chrome do Android.
2. Toque no menu "⋮" → **"Adicionar ao ecrã inicial"** / **"Instalar app"**.
3. O Fin JM passa a abrir como um app normal, em ecrã inteiro, com ícone
   próprio — sem barra de endereço do navegador.

No mobile, a navegação principal aparece numa barra fixa na parte inferior
do ecrã (estilo app nativo), enquanto no desktop continua no topo.

---

## 6. Nome de Utilizador (login sem precisar do e-mail)

Cada conta tem um **nome de utilizador único**, só com minúsculas, números
e "_" (3 a 20 caracteres) — definido no registo e editável depois em
**Perfil → Nome de Utilizador**.

Ele serve para duas coisas:

1. **Entrar na conta** sem digitar o e-mail: no ecrã de login, o campo
   aceita e-mail OU nome de utilizador — a app detecta automaticamente
   (se não tiver "@", trata como utilizador).
2. **Convidar alguém para uma carteira em grupo** escrevendo o nome de
   utilizador dela em vez do e-mail (útil quando não sabe o e-mail de cor,
   mas sabe o utilizador).

Tecnicamente, isto funciona através de uma função no Supabase
(`obter_email_por_username`) que traduz o username para o e-mail
correspondente antes de autenticar ou de guardar o convite — o Supabase
Auth continua a funcionar por e-mail "por baixo dos panos", a tradução é
transparente para quem usa a app.

## 7. Carteiras em grupo (partilhadas)

Qualquer carteira pode ser partilhada com outras pessoas:

1. Na página **Carteiras**, clique em **"Membros"** na carteira desejada (só
   o dono vê este botão).
2. Introduza o e-mail da pessoa e escolha o papel:
   - **Editor** — pode lançar, editar e apagar transações na carteira
   - **Visualizador** — só pode ver
3. A pessoa convidada precisa de **criar uma conta no Fin JM com esse mesmo
   e-mail**. Assim que fizer login, o convite é aceite automaticamente e a
   carteira aparece na lista dela com a etiqueta "Partilhada comigo".

O dono continua a ser o único que pode editar o nome da carteira, remover
membros ou apagar a carteira inteira.

---

## 8. Notificações Push (avisos de orçamento mesmo com a app fechada)

Esta funcionalidade é opcional e requer configuração adicional (fora do
Supabase básico), porque envolve enviar notificações mesmo quando ninguém
tem a app aberta.

**Passo 1 — Gerar as chaves VAPID** (uma única vez, no seu computador):
```bash
npx web-push generate-vapid-keys
```
Isto devolve uma `Public Key` e uma `Private Key`.

**Passo 2 — Frontend:** adicione a chave pública como variável de ambiente
(no `.env.local` e nos Secrets do GitHub Actions):
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=a_sua_public_key
```

**Passo 3 — Edge Function:** publique a função incluída em
`supabase/functions/send-budget-alerts` e configure os secrets:
```bash
supabase functions deploy send-budget-alerts
supabase secrets set VAPID_PUBLIC_KEY=a_mesma_public_key VAPID_PRIVATE_KEY=a_private_key VAPID_SUBJECT=mailto:tonilsonjm@gmail.com
```

**Passo 4 — Agendar** (ative as extensões `pg_cron` e `pg_net` em
*Database → Extensions* e rode no SQL Editor):
```sql
select cron.schedule(
  'finjm-budget-alerts-diario',
  '0 8 * * *', -- todo dia às 08h00
  $$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/send-budget-alerts',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_SERVICE_ROLE_KEY')
  );
  $$
);
```

Depois disso, cada utilizador que tenha definido um limite mensal no Perfil e
tenha tocado em **"Ativar notificações"** vai receber um aviso no telemóvel
quando chegar a 80% (ou ultrapassar) o limite — mesmo com a app fechada.

---

## 9. Relatório Mensal em PDF por E-mail (Plano PRO)

Também opcional e também requer um serviço externo de e-mail, já que o
Supabase não envia e-mails com anexos por conta própria.

**Passo 1 — Crie uma conta gratuita em [resend.com](https://resend.com)**
e gere uma API Key.

**Passo 2 — Publique a função e configure os secrets:**
```bash
supabase functions deploy monthly-report
supabase secrets set RESEND_API_KEY=a_sua_api_key RESEND_FROM="Fin JM <relatorios@seudominio.com>"
```
(Enquanto não tiver domínio verificado na Resend, pode usar o remetente de
testes deles, `onboarding@resend.dev`, para experimentar.)

**Passo 3 — Agendar** (todo dia 1 de cada mês, às 07h00):
```sql
select cron.schedule(
  'finjm-relatorio-mensal',
  '0 7 1 * *',
  $$
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/monthly-report',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_SERVICE_ROLE_KEY')
  );
  $$
);
```

A função gera um PDF real (mesma biblioteca usada na exportação do
frontend) com as transações do mês anterior de cada utilizador **PRO** e
envia por e-mail automaticamente.

---

## 10. Regras de negócio implementadas

| Regra | Onde está aplicada |
|---|---|
| Plano FREE: máx. 2 carteiras | Trigger SQL `check_wallet_limit` + verificação no frontend |
| Plano FREE: máx. 100 transações/mês | Trigger SQL `check_transaction_limit` + verificação no frontend |
| Plano FREE: sem exportar PDF/Excel | Bloqueado no frontend (`perfil.plano !== 'PRO'`) |
| Dados isolados por utilizador | RLS: dono OU membro aceite da carteira em `wallets`/`transactions` |
| Nome de utilizador único (login e convites) | Coluna `username` com check de formato + função `obter_email_por_username` |
| Só o Super Admin muda planos | Trigger `prevent_plan_self_change` + policy RLS de `profiles` |
| Ativação manual do PRO | Botão "Tornar-se PRO" → modal WhatsApp → Admin ativa em `/admin` |
| Alerta de orçamento mensal | Campo `limite_gasto_mensal` no Perfil + aviso no Dashboard a partir de 80% do limite |
| Editar transações | Botão de lápis na tabela de Transações |
| Buscar transações por descrição | Campo de busca no topo da página de Transações |
| Carteiras em grupo | Tabela `wallet_members` + RLS `has_wallet_access` / `can_edit_wallet` |
| Transferência entre carteiras | Duas transações ligadas por `transferencia_grupo_id`, excluídas dos gráficos de gasto/receita |
| Transações recorrentes | Tabela `recurring_transactions`, lançadas automaticamente ao abrir a página "Recorrentes" |
| Metas com contribuição automática | Campo `contribuicao_mensal`, aplicado automaticamente ao abrir "Metas" |
| Histórico de mudanças de plano | Trigger `log_plan_change` grava em `plan_history`, visível em `/admin` |
| Gráfico de crescimento de utilizadores | Calculado a partir de `profiles.created_at`, em `/admin` |
| Notificações push | Tabela `push_subscriptions` + Edge Function `send-budget-alerts` (ver seção 8) |
| Relatório mensal em PDF por e-mail | Edge Function `monthly-report` + Resend (ver seção 9) |

---

## 11. Limitações conhecidas / próximos passos

- As transações recorrentes e a contribuição automática de metas só são
  processadas **quando alguém abre a respetiva página** (não há um relógio
  a correr em segundo plano no plano gratuito do Supabase sem Edge
  Functions + `pg_cron`). Para automação 100% independente da app aberta,
  pode-se criar Edge Functions equivalentes e agendá-las como nas seções 7 e 8.
- Notificações push e relatório por e-mail exigem contas externas (VAPID
  próprio + Resend) — ambas gratuitas, mas fora do Supabase.
- Ativar confirmação de e-mail em produção (Supabase Auth Settings) é
  recomendado antes de lançar publicamente.
