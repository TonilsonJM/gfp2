# GFP - Gestão Financeira Pessoal

Aplicação web responsiva de gestão financeira pessoal e em grupo.

- **Frontend:** Next.js (App Router) + TailwindCSS, exportado como site estático → GitHub Pages
- **Backend / Banco de Dados / Autenticação:** Supabase (plano gratuito)
- **Gráficos:** Chart.js (via react-chartjs-2)
- **Moeda:** Kwanza (Kz)

---

## 1. Configurar o Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto (plano Free).
2. Vá a **SQL Editor** → cole todo o conteúdo do ficheiro `supabase/schema.sql` → **Run**.
   Isto cria as tabelas `profiles`, `wallets`, `categories`, `transactions`, `goals`,
   as funções, os triggers de limite de plano e todas as políticas RLS.
3. Vá a **Authentication → Providers** e confirme que "Email" está ativo.
   - Para testes rápidos, em **Authentication → Settings**, pode desativar
     "Confirm email" para que o login funcione imediatamente após o registo.
4. Vá a **Project Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Ativar o Super Admin

O e-mail **tonilsonjm@gmail.com** é automaticamente marcado como Super Admin
(`is_admin = true`) assim que essa conta se **regista** na aplicação (o
trigger `handle_new_user` trata disso).

Se essa conta já existir e não estiver marcada como admin, corrija manualmente
no **SQL Editor**:

```sql
update public.profiles set is_admin = true where email = 'tonilsonjm@gmail.com';
```

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
   git commit -m "GFP - Gestão Financeira Pessoal"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```
2. No GitHub, vá a **Settings → Pages** → em "Source" escolha **GitHub Actions**.
3. Vá a **Settings → Secrets and variables → Actions** e adicione dois secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Faça push para `main` — o workflow `.github/workflows/deploy.yml` já incluído
   faz o build (`next build` com `output: export`) e publica automaticamente
   em `https://SEU-USUARIO.github.io/SEU-REPO/`.

### Deploy alternativo: Vercel

Se preferir, basta importar o repositório em [vercel.com](https://vercel.com),
definir as duas variáveis de ambiente acima no painel do projeto, e o deploy
é automático a cada push (não precisa do `output: export` nesse caso, mas o
projeto funciona da mesma forma).

---

## 4. Estrutura de pastas

```
gfp-app/
├── .github/workflows/deploy.yml   # Deploy automático no GitHub Pages
├── supabase/schema.sql            # Tabelas + Triggers + RLS do Supabase
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Layout raiz (Navbar, providers)
│   │   ├── page.tsx               # Landing page
│   │   ├── login/page.tsx
│   │   ├── registo/page.tsx
│   │   ├── dashboard/page.tsx     # Saldos + gráficos
│   │   ├── carteiras/page.tsx     # CRUD de carteiras
│   │   ├── transacoes/page.tsx    # CRUD + filtros + exportação
│   │   ├── metas/page.tsx         # CRUD de metas
│   │   ├── perfil/page.tsx        # Plano atual + Tornar-se PRO
│   │   └── admin/page.tsx         # Painel exclusivo do Super Admin
│   ├── components/                # Navbar, ThemeToggle, gráficos, ui/...
│   ├── context/AuthContext.tsx    # Sessão, perfil, isPro, isAdmin
│   └── lib/                       # supabaseClient, types, exportUtils, utils
├── package.json
├── next.config.mjs                # output: 'export' (GitHub Pages)
├── tailwind.config.ts
└── tsconfig.json
```

---

## 5. Regras de negócio implementadas

| Regra | Onde está aplicada |
|---|---|
| Plano FREE: máx. 2 carteiras | Trigger SQL `check_wallet_limit` + verificação no frontend |
| Plano FREE: máx. 100 transações/mês | Trigger SQL `check_transaction_limit` + verificação no frontend |
| Plano FREE: sem exportar PDF/Excel | Bloqueado no frontend (`perfil.plano !== 'PRO'`) |
| Dados isolados por utilizador | RLS: `auth.uid() = user_id` em todas as tabelas |
| Só o Super Admin muda planos | Trigger `prevent_plan_self_change` + policy RLS de `profiles` |
| Ativação manual do PRO | Botão "Tornar-se PRO" → modal WhatsApp → Admin ativa em `/admin` |

---

## 6. Próximos passos sugeridos

- Ativar confirmação de e-mail em produção (Supabase Auth Settings).
- Adicionar upload de comprovativo de pagamento (Supabase Storage) antes da
  ativação manual do PRO, se desejar automatizar mais o fluxo.
- Adicionar paginação na tabela de transações caso o histórico cresça muito.
