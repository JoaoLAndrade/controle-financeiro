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
