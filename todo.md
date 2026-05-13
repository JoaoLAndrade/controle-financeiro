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
