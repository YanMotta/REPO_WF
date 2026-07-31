# Workflow Brasal — Especificação do projeto para replicação

Este documento descreve o projeto completo (propósito, stack, modelo de dados, regras de negócio e
telas) para que possa ser **recriado do zero** em outra máquina, sem depender do repositório Git
original. Cole este arquivo inteiro numa conversa com o Claude Code (ou Claude Desktop com acesso a
terminal) na outra máquina e peça para construir o projeto a partir dele.

## 1. Visão geral

Sistema interno de gestão de projetos e atividades, com foco especial num **checklist recorrente de
fechamento contábil mensal** (inspirado numa planilha Excel real de fechamento usada pela equipe).
Combina três formas de visualizar o mesmo conjunto de atividades — quadro Kanban, linha do tempo
Gantt, e uma lista tabular por mês — mais um Dashboard de indicadores (KPIs).

Identidade visual inspirada na marca **Brasal Refrigerantes**: tema claro, vermelho como cor de
destaque, logo com ícone circular vermelho (anel) ao lado do nome do sistema em negrito.

## 2. Stack técnica

- **Monorepo:** pnpm workspaces (`apps/backend`, `apps/frontend`, `packages/shared`)
- **Backend:** NestJS 10 + TypeScript, TypeORM 0.3
  - Banco de produção: SQL Server (`mssql`), com migrations
  - Banco de dev local: SQLite via driver `sql.js` (`type: "sqljs"`), sem migrations —
    `synchronize: true` cria o schema automaticamente. Ativado com `DB_TYPE=sqlite` no `.env`.
    Escolhido para não exigir instalação de SQL Server nem privilégios de admin na máquina de dev.
  - Auth: JWT (`@nestjs/jwt` + `passport-jwt`), papéis via `RolesGuard` (`ADMIN`/`MANAGER`/`MEMBER`)
  - Agendamento: `@nestjs/schedule` (cron jobs a cada minuto)
  - Eventos: `@nestjs/event-emitter` (`EventEmitter2`) para desacoplar side-effects (notificações)
  - Rate limiting: `@nestjs/throttler`
  - Swagger em `/docs`
- **Frontend:** React 18 + Vite 5 + TypeScript
  - UI: Mantine 7 (tema customizado, ver seção 7)
  - Data fetching: TanStack Query 5
  - Drag-and-drop: `@hello-pangea/dnd`
  - Roteamento: `react-router-dom`
- **`packages/shared`:** enums e interfaces TypeScript compartilhadas entre backend e frontend
  (única fonte de verdade para o formato dos DTOs)

## 3. Modelo de dados

### User
`id, name, email (único), passwordHash, role (ADMIN|MANAGER|MEMBER), isActive`

### Project
`id, name, description, status (ACTIVE|ON_HOLD|ARCHIVED), ownerId, startDate, endDate`

Neste projeto específico, na prática existe **um único projeto fixo**, chamado `"Fechamento
Mensal"`, resolvido/criado automaticamente pelo backend (nunca escolhido manualmente pelo usuário) —
ver seção 5.4.

### Activity
Entidade central. Campos:
- `id, projectId, title, description, responsibleId, priority (LOW|MEDIUM|HIGH|URGENT)`
- `status`: `BACKLOG | TO_DO | READY_TO_START | IN_PROGRESS | DONE | LATE` — os 6 estágios do fluxo
  padronizado. `READY_TO_START` e `LATE` são **atingidos automaticamente pelo sistema** (nunca
  escolhidos manualmente — ver `assertManualStatusTransition`), via resolução de dependências e cron
  de atraso respectivamente. Não existe etapa de validação manual: atividades entram prontas no
  fluxo.
- `startDate, deadline` (datas)
- `businessDayOffset: number | null` — deslocamento de dia útil que gerou o `deadline` (ver seção
  5.1). `null` = prazo definido manualmente (não segue regra de dia útil).
- `dueDateRuleMonth, dueDateRuleYear: number | null` — mês/ano de referência usados para calcular o
  `businessDayOffset`. Servem também de **chave de idempotência** para a geração mensal (seção 5.4) —
  importante: um `PATCH` que define um `deadline` manual **deve preservar** esses dois campos
  (zerando só o `businessDayOffset`), senão a próxima geração do mês recria a atividade duplicada.
- `dueTime: string | null` — horário-limite no formato `"HH:mm"`, aplicado ao componente de hora do
  `deadline` no momento do cálculo (não é um campo cosmético separado)
- `templateId: number | null` — se veio de um modelo recorrente (seção 5.4)
- `completionDate, progressPercent (0-100), estimatedHours, actualHours, exceededHours` (numérico,
  calculado — nunca setável diretamente pela API)
- `notes`
- Relação N:N consigo mesma via `ActivityDependency` (`activityId`, `dependsOnActivityId`) —
  dependências reais entre atividades

### ActivityHistory
Log de auditoria: `activityId, eventType (CREATED|STARTED|ASSIGNEE_CHANGED|STATUS_CHANGED|
BECAME_LATE|DEPENDENCY_RESOLVED|COMPLETED), oldValue, newValue, changedById, occurredAt`

### ActivityTemplate (modelo recorrente do Checklist)
Não tem mês/ano — é a "receita" que gera uma `Activity` real todo mês. Campos: `title, description,
responsibleId, priority, businessDayOffset (obrigatório, não pode ser 0), dueTime, estimatedHours,
notes, isActive`. Relação N:N consigo mesma via `ActivityTemplateDependency` (predecessoras entre
modelos, replicadas nas atividades geradas todo mês).

### NotificationLog
`type (DEPENDENCY_RELEASED|APPROACHING_DEADLINE|BECAME_LATE|ASSIGNEE_CHANGED), channel, recipientId,
activityId, subject, body, status (SENT|FAILED), sentAt`

## 4. Cálculo de dia útil (`packages/shared/business-days.ts`)

Função pura, sem chamada externa: `getNthBusinessDay(year, month, offset, options)`.
- `offset` positivo conta a partir do início do mês (1 = primeiro dia útil, 2 = segundo, ...)
- `offset` negativo conta a partir do fim (-1 = último dia útil, -2 = penúltimo, ...)
- `offset === 0` lança erro; offset além da quantidade de dias úteis do mês também lança erro
- Considera fins de semana e feriados nacionais brasileiros fixos e móveis (Páscoa calculada via
  algoritmo de Meeus/Jones/Butcher)
- `resolveBusinessDayOffset(offset, year, month, options)` retorna a data resolvida (string) ou
  `null`

## 5. Regras de negócio centrais

### 5.1 Prazo por dia útil vs. manual
Uma atividade pode ter o `deadline` calculado automaticamente (`businessDayOffset` +
`dueDateRuleMonth/Year` definidos) ou definido manualmente (`deadline` explícito, `businessDayOffset
= null`). Ao editar uma atividade que já tem regra de dia útil, um `deadline` manual explícito
**sobrepõe** a regra — mas os campos `dueDateRuleMonth/Year` são preservados (só o
`businessDayOffset` é zerado), justamente para não quebrar a idempotência da geração mensal (5.4).

### 5.2 Máquina de estados (status)
- Transição manual para `READY_TO_START` ou `LATE` é **proibida** pela API (só o sistema define).
- Transição manual para `IN_PROGRESS` é bloqueada se a atividade tiver dependências não concluídas
  (`blockedBy.length > 0`).
- Ao adicionar uma dependência a uma atividade que estava `TO_DO`, ela é rebaixada automaticamente
  para `BACKLOG` (mesma regra aplicada na criação).
- Quando **todas** as dependências de uma atividade `BACKLOG` são concluídas, ela sobe
  automaticamente para `READY_TO_START` (listener assíncrono via evento `activity.completed`).

### 5.3 Job de atraso (cron a cada minuto)
- Qualquer atividade com `deadline < agora` e status fora de `{DONE, LATE}` vira `LATE`
  automaticamente, dispara evento `activity.becameLate` (→ notificação) e grava
  `ActivityHistory(BECAME_LATE)`.
- Atividades já `LATE` têm o `exceededHours` recalculado a cada execução (permanece "ao vivo"
  enquanto não for concluída).
- Ao marcar uma atividade como `DONE` manualmente, `exceededHours` é fixado nesse momento:
  `max(0, completionDate - deadline)` em horas — **importante:** deve ser sempre recalculado (mesmo
  que dê 0), nunca só condicionalmente, senão um valor antigo fica "grudado" ao reabrir/completar de
  novo com prazo diferente.
- Há também um job de "prazo se aproximando" (`ApproachingDeadlineJob`), com janela configurável via
  `APPROACHING_DEADLINE_WINDOW_HOURS` (padrão 24h), que dispara notificação uma vez por atividade.

### 5.4 Geração do Checklist mensal (`ClosureService.generateForMonth`)
Chamada ao abrir a aba "Atividades" (ou por qualquer requisição a `POST /closure/generate`):
1. Resolve (ou cria, na primeira vez) o projeto fixo `"Fechamento Mensal"`.
2. **Bloqueio importante:** se o mês/ano pedido for **anterior** ao mês atual real, a função é um
   no-op (`created: 0`) — meses já encerrados nunca são regenerados. Isso existe porque, sem essa
   trava, reabrir um mês passado recriava um checklist inteiro do zero já com todas as atividades
   nascendo atrasadas (prazo no passado), disparando uma enxurrada de notificações de atraso em
   massa. A trava vale tanto no backend quanto — por segurança adicional — na tela (que só chama a
   geração para o mês atual, nunca mostra seletor de mês passado).
3. Para cada `ActivityTemplate` ativo, verifica se já existe uma `Activity` com
   `(templateId, dueDateRuleMonth, dueDateRuleYear)` iguais aos do mês pedido — se sim, reaproveita;
   se não, cria uma nova a partir do modelo.
4. Numa segunda fase, replica as predecessoras dos modelos (`ActivityTemplateDependency`) como
   `ActivityDependency` reais entre as atividades geradas **daquele mês** — idempotente e
   autocorretiva (preenche links que faltarem mesmo em meses já gerados antes, ex.: predecessora
   adicionada ao modelo depois da primeira geração).

### 5.5 Notificações
Arquitetura orientada a eventos: qualquer serviço emite um evento de domínio (`activity.becameLate`,
`activity.completed`, `activity.assigneeChanged`, `dependency.released`, `activity.approachingDeadline`)
e um listener dedicado (`apps/backend/src/notifications/listeners/*.ts`) monta a mensagem e chama
`NotificationsService.dispatch(...)`, que grava em `NotificationLog` e delega ao canal configurado
(interface `NotificationChannel` — implementações trocáveis: `ConsoleNotificationService` para
log/dev, `SmtpNotificationService` para e-mail real).

## 6. Telas do frontend

Barra lateral, nesta ordem: **Cronogramas** → Dashboard → Quadro Kanban → Projetos → Gantt →
Checklist. (Renomeada de "Atividades" pra "Cronogramas"/"Projetos" ao longo do desenvolvimento — ver
notas de nomenclatura abaixo.)

### Login
E-mail + senha → `POST /auth/login`, guarda JWT no `localStorage`. Sem tela de cadastro visível — só
via `POST /auth/register` direto na API (sempre cria papel `MEMBER`).

### Atividades (rota `/fechamento`)
Tabela somente-leitura (sem editar/excluir) do checklist do **mês atual, fixo** (sem seletor de
mês/ano) — dispara `generateForMonth` automaticamente ao entrar. Colunas: `#` (número sequencial por
prazo), Atividade (clicável → abre painel lateral de detalhes, sem botão excluir), Responsável,
Predecessora (mostra o número da linha quando a dependência está no mesmo mês, senão o título),
Premissa (badge com a regra de dia útil ou "Manual"), Previsto (data), Horário, Status (badge
colorido). Cabeçalho mostra "N atividade(s) neste mês".

### Dashboard (rota `/dashboard`)
Tem seletor de mês/ano próprio (não compartilhado com outras telas). Cards de estatística: Projetos
ativos, Atividades atrasadas, Horas excedentes acumuladas, Atraso médio, Lead time médio, %
conclusão, % no prazo (removido "Cycle time médio" a pedido). Abaixo: dois anéis de progresso
(Concluído / No prazo), barra de atividades por status, tabela de produtividade por responsável,
tabela de gargalos por projeto. Aceita chegar pré-filtrado via querystring `?month=&year=` (usado
pelos cards da tela "Projetos").

### Quadro Kanban (rotas `/quadro` — todos os projetos — e `/projetos/:id` — projeto único)
Colunas = os 6 status, cards arrastáveis (`@hello-pangea/dnd`). Seletor de mês/ano próprio (filtra os
cards pelo mês do `deadline`). Ao arrastar um card para "Concluído", pede confirmação
(`window.confirm`) antes de efetivar — evita completar sem querer (histórico: já aconteceu por
engano mais de uma vez). Sem botão de criar atividade avulsa aqui (só existe na aba Checklist).

### Projetos / "Cronogramas" (rota `/projetos`)
**Não** lista projetos de verdade (só existe um). Em vez disso mostra um card quadrado (200×200px,
texto centralizado vertical e horizontalmente) por **mês já gerado**, só até o mês atual (meses
futuros não aparecem ainda — "vão sendo adicionados conforme o tempo passa"). Texto do card:
`"Cronograma - MM/AA"` (ex.: `"Cronograma - 07/26"`), com a contagem de atividades e, logo abaixo, a
contagem de atividades atrasadas daquele mês (vermelho se > 0). Clicar no card navega para o
Dashboard já filtrado naquele mês (`/dashboard?month=X&year=Y`).

### Gantt (rota `/gantt`)
Linha do tempo horizontal contínua (todas as atividades, todos os meses, agrupadas por projeto), com
marcador vertical do dia de hoje. Seletor de mês/ano próprio — ao trocar, a timeline **rola
automaticamente** até esse mês (não filtra, só rola).

### Checklist (rota `/modelos-fechamento`)
CRUD dos `ActivityTemplate`. Formulário: título, descrição, responsável, prioridade, "Premissa"
(select "a partir do início/fim do mês" + número do dia útil, combinados no `businessDayOffset`
assinado), horário-limite, predecessoras (multi-select de outros modelos), horas previstas,
observações. Botão extra "Nova atividade avulsa" (abre o mesmo formulário de criar `Activity` usado
no Kanban, travado no projeto "Fechamento Mensal", sem seletor de projeto) — é o **único lugar** do
sistema onde dá pra criar uma atividade pontual fora do checklist recorrente.

## 7. Design system (identidade Brasal)

- Tema Mantine **claro** (`defaultColorScheme: "light"`), cor primária customizada `"workflow"` —
  paleta de vermelho (não usar o vermelho padrão do Mantine, definir manualmente 10 tons, do mais
  claro ao mais escuro, ex. `#fff0f0` → `#850808`).
- Logo no cabeçalho: ícone circular vermelho (anel/aro, não círculo cheio) + texto "Workflow" em
  negrito escuro ao lado. Se o usuário fornecer o arquivo de imagem real do logo, usá-lo via
  `background-image` com `background-size: auto 100%` e `background-position: left center` num `div`
  quadrado pequeno (evita distorcer se a imagem for retangular/larga) em vez de um `<img>` esticado.
- Bordas e fundos que dependiam do tema escuro (`var(--mantine-color-dark-X)`, `bg="dark.6"`) devem
  ser trocados por tokens que se adaptam ao tema claro: `var(--mantine-color-body)` (fundo de
  página), `var(--mantine-color-default-border)` (borda), ou tons de `gray` claros.
- Badges de status usam cores semânticas (`STATUS_COLOR`): Backlog/A Fazer = cinza, Pronta p/
  Iniciar/Em Andamento = azul, Concluído = verde, Atrasado = vermelho.

## 8. Autenticação e papéis

JWT com expiração de 8h (`JWT_EXPIRES_IN=8h`). Papéis `ADMIN`, `MANAGER`, `MEMBER` — auto-registro
sempre cria `MEMBER`; promoção a `ADMIN`/`MANAGER` exige outro admin autenticado
(`PATCH /users/:id`), nunca via rota pública.

## 9. Coisas para não esquecer (erros já cometidos e corrigidos nesta implementação)

- **Nunca** deixar a geração do checklist mensal rodar para meses passados sem querer — sempre
  travar tanto no frontend quanto no backend (seção 5.4).
- Ao editar `exceededHours` na conclusão de uma atividade, **sempre** recalcular (mesmo para 0),
  nunca só dentro de um `if (atrasado)` — senão um valor antigo alto fica preso mesmo depois de
  corrigir o prazo.
- Um `PATCH` de `deadline` manual numa atividade vinda de modelo **deve preservar**
  `dueDateRuleMonth`/`dueDateRuleYear` (só zerar `businessDayOffset`) — são a chave de idempotência
  da geração mensal.
- No Kanban, mover um card para "Concluído" via drag-and-drop deve pedir confirmação — já aconteceu
  de completar atividade sem querer.
- Nunca commitar `.env`, `*.sqlite`, nem `.claude/settings.local.json` (esse último já teve um token
  JWT de dev vazado nele).
