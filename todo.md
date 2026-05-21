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
