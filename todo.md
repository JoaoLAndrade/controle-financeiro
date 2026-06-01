# Controle Financeiro — TODO

## Schema & Banco de Dados
- [x] Tabela `categories` (id, userId, name, color, icon, type, createdAt)
- [x] Tabela `transactions` (id, userId, amount, date, description, categoryId, type, createdAt, updatedAt)
- [x] Migração e aplicação do schema no banco

## Backend (tRPC Routers)
- [x] Router `categories`: list, create, update, delete
- [x] Router `transactions`: list (com filtros), create, update, delete, summary
- [x] Router `reports`: monthlySummary, categoryBreakdown, incomeVsExpenses

## Frontend — Design System & Layout
- [x] Paleta de cores e tipografia elegante (index.css)
- [x] DashboardLayout com sidebar em português
- [x] Componente de formatação de moeda BRL

## Frontend — Dashboard
- [x] Cards de resumo: saldo total, receitas e despesas do mês
- [x] Gráfico de evolução mensal (linha/barra)
- [x] Lista das últimas transações

## Frontend — Transações
- [x] Página de listagem com filtros (período, tipo, categoria)
- [x] Modal/formulário de criação de transação
- [x] Modal de edição de transação
- [x] Confirmação e exclusão de transação

## Frontend — Categorias
- [x] Página de gerenciamento de categorias
- [x] Formulário de criação/edição com cor e ícone
- [x] Exclusão de categoria

## Frontend — Relatório Mensal
- [x] Gráfico de pizza por categoria
- [x] Comparativo receitas vs. despesas
- [x] Seletor de mês/ano

## Autenticação
- [x] Proteção de todas as rotas com OAuth
- [x] Dados separados por usuário (userId em todas as queries)

## Testes
- [x] Testes vitest para routers de categorias
- [x] Testes vitest para routers de transações

## Transações Recorrentes
- [x] Tabela `recurring_transactions` (id, userId, name, amount, type, categoryId, dayOfMonth, active, lastGeneratedMonth, createdAt)
- [x] Migração e aplicação do schema no banco
- [x] Router `recurring`: list, create, update, delete, generateForMonth
- [x] Lógica de geração automática: ao abrir o app, gerar transações do mês atual se ainda não geradas
- [x] Página de Recorrências com listagem, criação, edição e ativação/desativação
- [x] Modal de criação/edição de recorrência (nome, valor, tipo, categoria, dia do mês)
- [x] Badge "Recorrente" nas transações geradas automaticamente
- [x] Link para Recorrências no sidebar
- [x] Testes vitest para o router de recorrências

## Bugs e Otimizações — Pente Fino
- [x] Corrigir query `getMonthlyEvolution`: `DATE_FORMAT` no `groupBy` via sql template causa erro 500
- [x] Corrigir side effect `localStorage.setItem` dentro de `useMemo` em `useAuth.ts`
- [x] Corrigir anti-pattern `<Link><a>` (nested anchors) em `AppLayout.tsx` e `Dashboard.tsx`
- [x] Adicionar fallback de NaN em `formatCurrency` para strings inválidas
- [x] Traduzir `ErrorBoundary` para português

## Correções Pente Fino — Rodada 2 (10 itens)
- [x] #1 Geração duplicada de recorrências — envolver INSERT+UPDATE em transação atômica (db.ts)
- [x] #2 Gráficos omitem meses sem movimentação — preencher meses zerados (Dashboard.tsx, Reports.tsx)
- [x] #3 endDate no Dashboard não cobre o dia inteiro — usar 23:59:59 (Dashboard.tsx)
- [x] #4 categoryBreakdown não invalidado após geração automática (AppLayout.tsx)
- [x] #5 Página 404 em inglês — traduzir para português (NotFound.tsx)
- [x] #6 Botões de ação em Categorias invisíveis em touch/mobile (Categories.tsx)
- [x] #7 Ícone errado no card de Impacto Mensal — ArrowDownRight quando negativo (Recurring.tsx)
- [x] #8 Código morto `grouped` em Categories.tsx
- [x] #9 Ausência de índices no banco — adicionar índices compostos via SQL
- [x] #10 Sem validação de ownership do categoryId em transactions.create/update (routers.ts)

## Tema Dark
- [x] Definir variáveis CSS para o tema dark em index.css
- [x] Habilitar ThemeProvider como switchable em App.tsx
- [x] Adicionar toggle de tema no sidebar (AppLayout.tsx)
- [x] Verificar contraste e legibilidade em todas as páginas no tema dark

## Metas Financeiras por Categoria
- [x] Tabela `goals` no schema (id, userId, categoryId, name, targetAmount, type, createdAt)
- [x] Migração aplicada no banco
- [x] Helpers `getGoalsWithProgress`, `createGoal`, `updateGoal`, `deleteGoal` no db.ts
- [x] Router `goals`: list, create, update, delete (com validação de ownership de categoryId)
- [x] Página `/metas` com listagem, criação/edição e exclusão de metas
- [x] Widget de metas no Dashboard com barra de progresso e alerta visual ≥80%
- [x] Link no sidebar (Target icon, entre Recorrências e Categorias)
- [x] Testes vitest para router de metas (9 testes)

## Histórico de Metas por Mês (yearMonth)
- [x] Adicionar coluna `yearMonth` (VARCHAR 7, ex: "2026-05") na tabela `goals` via migração SQL
- [x] Atualizar `drizzle/schema.ts` com o campo `yearMonth`
- [x] Atualizar helpers `getGoalsWithProgress`, `createGoal`, `updateGoal` para usar `yearMonth`
- [x] Atualizar router `goals.list` para filtrar por `yearMonth` (metas do mês selecionado)
- [x] Atualizar router `goals.create` e `goals.update` para aceitar `yearMonth`
- [x] Página /metas: seletor de mês/ano com navegação ← → e botão "Voltar ao mês atual"
- [x] Dashboard: widget de metas mostra sempre o mês corrente
- [x] Migrar metas existentes para o mês atual via UPDATE SQL
- [x] Testes vitest atualizados para cobrir yearMonth (11 testes, 31 total)

## Copiar Metas do Mês Anterior
- [x] Helper `copyGoalsFromPreviousMonth(userId, targetYearMonth)` no db.ts
- [x] Procedure tRPC `goals.copyFromPrevious` com input `{ yearMonth }`
- [x] Botão "Copiar de [mês anterior]" no header da página /metas (sempre visível)
- [x] Botão "Copiar metas de [mês anterior]" também no empty state
- [x] Toast de confirmação com número de metas copiadas (ou aviso se não houver metas no mês anterior)
- [x] Testes vitest: 3 novos testes (copia, validação de formato, acesso não autenticado) — 34 testes no total

## Dashboard Editável
- [x] Tabela `dashboard_prefs` no schema (id, userId, widgetOrder JSON, hiddenWidgets JSON)
- [x] Migração SQL aplicada
- [x] Helpers `getDashboardPrefs` e `saveDashboardPrefs` no db.ts
- [x] Router tRPC `dashboard.getPrefs` e `dashboard.savePrefs`
- [x] Modo de edição no Dashboard: botão "Editar Dashboard" no header
- [x] Drag-and-drop para reordenar widgets (usando @dnd-kit)
- [x] Toggle para mostrar/ocultar cada widget (botão Visível/Oculto)
- [x] Botões "Salvar Layout" e "Cancelar" no modo de edição
- [x] Preferências persistidas no banco por usuário (upsert por userId)
- [x] Testes vitest: 8 testes para dashboard router — 42 testes no total

## Correção de Bugs Críticos (Revisão)
- [x] Bug 1: TransactionModal — `.replace(",", ".")` normaliza vírgula decimal corretamente
- [x] Bug 2: Recurring — mesmo fix de normalização de vírgula decimal
- [x] Bug 3: getDashboardPrefs — JSON.parse envolvido em try/catch com fallback para defaults
- [x] Bug 4: generateRecurringForMonth — cast corrigido: `const [rows] = ...; const current = rows[0]`

## Revisão Completa — 18 Correções e Melhorias
- [x] #1 TransactionModal: vírgula decimal (.replace(",","."))
- [x] #2 Recurring: vírgula decimal (.replace(",","."))
- [x] #3 getDashboardPrefs: JSON.parse com try/catch
- [x] #4 SELECT FOR UPDATE: cast correto [rows][0]
- [x] #5 formatCurrency: currency "USD"→"BRL" e locale "en-US"→"pt-BR" (lib/format.ts)
- [x] #6 Dashboard gráfico: tickFormatter usando formatCurrency BRL
- [x] #7 Reports gráfico: tickFormatter usando formatCurrency BRL
- [x] #8 amount > 0: .refine(v => parseFloat(v) > 0) nos schemas Zod (transactions, recurring, goals)
- [x] #9 year/month bounds: z.number().min(2000).max(2100) em goals.list, reports e recurring
- [x] #10 cor hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/) em categories.create/update
- [x] #11 dayOfMonth: z.number().min(1).max(31) em recurring.create/update
- [x] #12 widgetOrder: z.array(z.enum(VALID_WIDGETS)) em dashboard.savePrefs
- [x] #13 deleteCategory: verifica vínculos (transactions, recurring, goals) antes de excluir
- [x] #14 isError: tratamento de erros de query em Transactions, Goals e Reports
- [x] #15 yearMonth default: removido hardcode "2026-01"; router sempre fornece explicitamente
- [x] #16 FK constraints: fk_transactions_category, fk_recurring_category, fk_goals_category via SQL
- [x] #17 staleTime: staleTime:30000 + retry:1 no QueryClient global (main.tsx)
- [x] #18 ownership query: checkCategoryOwnership() — query direta WHERE id=? AND userId=? em 5 procedures

## Seletor de Moeda (BRL/USD)
- [x] Coluna `currency` (enum "BRL"|"USD") na tabela `users` via SQL
- [x] Procedure tRPC `auth.updateCurrency` para salvar preferência
- [x] Contexto React `CurrencyContext` com `currency`, `setCurrency` e `formatMoney()`
- [x] `formatMoney` usa locale pt-BR+BRL ou en-US+USD conforme preferência
- [x] Seletor de moeda no sidebar (botão toggle R$/US$)
- [x] Aplicar `formatMoney` em Dashboard, Transactions, Goals, Reports, Recurring
- [x] Persistir preferência no banco ao trocar
- [x] Testes vitest para `auth.updateCurrency` (4 testes: BRL, USD, acesso não autenticado, valor inválido) — 46 testes no total
- [x] Rollback de estado local no CurrencyContext se a mutation falhar (onError com toast)

## Correções do Pente Fino — Rodada 3 (12 achados)

### Bugs P1
- [x] TransactionModal: símbolo de moeda hardcoded em "$" — usar useCurrency()
- [x] Recurring.tsx: generateMutation.onSuccess não invalida categoryBreakdown nem goals.list
- [x] Transactions.tsx: deleteMutation.onSuccess não invalida reports (summary/totalBalance/evolution/breakdown)
- [x] Transactions.tsx: onSuccess do modal não invalida categoryBreakdown
- [x] Categories.tsx: update/delete mutations não invalidam transactions.list, categoryBreakdown, goals.list

### Débitos Técnicos
- [x] lib/format.ts: remover função formatCurrency (código morto)
- [x] Transactions.tsx: substituir useState<any> por tipo explícito (EditingTransaction)
- [x] Categories.tsx: substituir useState<any> por tipo explícito (CategoryRow)
- [x] Recurring.tsx: substituir useState<any> por tipo explícito (EditingRecurring)
- [x] Transactions.tsx: remover cast (v: any) no onValueChange do Select
- [x] Dashboard.tsx + Reports.tsx: tipar props any dos tooltips com TooltipProps do Recharts
- [x] auth.currency.test.ts: assert de chamada ao helper, teste de falha, beforeEach com clearAllMocks
- [x] main.tsx: remover console.error global duplicado, manter apenas redirecionamento UNAUTHORIZED

### Otimizações
- [x] server/db.ts getMonthlyEvolution: agregar no SQL com YEAR/MONTH + GROUP BY (sem carregar linhas em memória)
- [x] server/db.ts getTransactions: limite máximo de 500 registros adicionado
- [x] server/db.ts getGoalsWithProgress: mapa de lookup em pass única com CAST(SUM) no SQL
