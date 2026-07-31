# Workflow Brasal

Sistema interno de gestão de projetos e atividades, com foco no checklist recorrente de
fechamento contábil mensal. Ver [workflow-brasal-spec.md](workflow-brasal-spec.md) para a
especificação completa do produto.

## Stack

- **Monorepo:** pnpm workspaces (`apps/backend`, `apps/frontend`, `packages/shared`)
- **Backend:** NestJS 10 + TypeORM 0.3 (SQLite via `sql.js` em dev, SQL Server em produção)
- **Frontend:** React 18 + Vite 5 + Mantine 7
- **packages/shared:** enums, DTOs e a lógica pura de cálculo de dia útil compartilhados entre
  backend e frontend

## Setup

### 1. Ativar o pnpm

```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
```

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar o backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Por padrão `DB_TYPE=sqlite`, que usa o driver `sql.js` — não exige instalar SQL Server nem
privilégios de admin na máquina de dev. O arquivo `apps/backend/data/dev.sqlite` é criado
automaticamente (schema via `synchronize: true`) e nunca deve ser commitado (já está no
`.gitignore`).

Para apontar para SQL Server em produção, defina `DB_TYPE=mssql` e as variáveis `DB_HOST`,
`DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` — nesse modo `synchronize` fica desligado
e o schema é gerenciado por migrations (`pnpm --filter @workflow-brasal/backend migration:run`).

### 4. Build do pacote compartilhado

```bash
pnpm --filter @workflow-brasal/shared build
```

### 5. Criar o primeiro usuário ADMIN

O auto-registro (`POST /auth/register`) sempre cria um usuário `MEMBER` — não existe rota pública
para criar um ADMIN. Para o primeiro admin de um ambiente novo, rode:

```bash
pnpm --filter @workflow-brasal/backend seed:admin
```

Lê `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME` do ambiente (com defaults de dev:
`admin@brasal.local` / `admin123456`). Depois disso, promoções adicionais a `ADMIN`/`MANAGER` são
feitas via `PATCH /users/:id` por um admin já autenticado.

### 6. Rodar em desenvolvimento

```bash
pnpm dev:backend
```

- API em `http://localhost:3000`
- Swagger em `http://localhost:3000/docs`

```bash
pnpm dev:frontend
```

## Estrutura

```
apps/backend    — API NestJS (auth, activities, closure, notifications, cron jobs)
apps/frontend   — SPA React/Mantine
packages/shared — enums, DTOs e business-days.ts (cálculo de dia útil)
```

## Testes

```bash
pnpm --filter @workflow-brasal/shared test    # business-days.ts
pnpm --filter @workflow-brasal/backend test   # regras de status, etc.
```
