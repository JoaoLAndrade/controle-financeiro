# Relatório de Pente Fino — Controle Financeiro

**Data:** 31 de maio de 2026  
**Autor:** Manus AI  
**Escopo:** Revisão completa do código-fonte (backend, frontend, testes e configuração)

---

## Resumo Executivo

Foram identificados **12 achados** distribuídos em três categorias de severidade: bugs funcionais que afetam o comportamento visível ao usuário, débitos técnicos que comprometem manutenibilidade ou segurança de tipo, e oportunidades de otimização de desempenho. Nenhuma das questões é crítica ao ponto de causar perda de dados, porém algumas impactam diretamente a experiência do usuário em cenários específicos.

---

## 1. Bugs Funcionais

### 1.1 TransactionModal — Símbolo de moeda hardcoded em USD

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `client/src/components/TransactionModal.tsx` (linhas 183–186) |
| **Impacto** | Alto — contradiz a feature de seletor de moeda |
| **Descrição** | O label do campo de valor exibe "Valor ($)" e o prefixo visual é `$`, independentemente da moeda selecionada pelo usuário. Após a implementação do `CurrencyContext`, todas as páginas de listagem já usam `formatMoney`, mas o modal de criação/edição permanece fixo em dólar. |
| **Correção sugerida** | Importar `useCurrency()` no componente e usar `currency === "BRL" ? "R$" : "$"` para o label e o prefixo visual. Ajustar o placeholder para `"0,00"` quando BRL. |

---

### 1.2 Recurring.tsx — Invalidação incompleta ao gerar transações manualmente

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `client/src/pages/Recurring.tsx` (linhas 62–76) |
| **Impacto** | Médio — dados desatualizados em outras páginas |
| **Descrição** | O `generateMutation.onSuccess` invalida `transactions.list`, `reports.totalBalance`, `reports.summary` e `reports.monthlyEvolution`, mas **não** invalida `reports.categoryBreakdown` nem `goals.list`. Isso significa que, após gerar recorrências pela página de Recorrências, os Relatórios por Categoria e as Metas ficam desatualizados até o próximo refresh. O fluxo automático no `AppLayout.tsx` (linha 58–60) já invalida ambos corretamente. |
| **Correção sugerida** | Adicionar `utils.reports.categoryBreakdown.invalidate()` e `utils.goals.list.invalidate()` no `onSuccess` do `generateMutation` em `Recurring.tsx`. |

---

### 1.3 Transactions.tsx — `deleteMutation` não invalida relatórios

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `client/src/pages/Transactions.tsx` (linhas 51–59) |
| **Impacto** | Médio — Dashboard e Relatórios ficam com dados antigos |
| **Descrição** | Ao excluir uma transação, o `onSuccess` faz apenas `refetch()` e `utils.goals.list.invalidate()`. Não invalida `reports.summary`, `reports.totalBalance`, `reports.monthlyEvolution` nem `reports.categoryBreakdown`. O `onSuccess` do modal de criação/edição (linhas 62–68) invalida parte desses, mas também omite `categoryBreakdown`. |
| **Correção sugerida** | Unificar as invalidações de `deleteMutation.onSuccess` com as do `onSuccess` do modal, incluindo `categoryBreakdown`. |

---

### 1.4 Categories.tsx — Mutations não invalidam caches dependentes

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `client/src/pages/Categories.tsx` (linhas 84–97) |
| **Impacto** | Baixo-Médio — labels e cores desatualizados em outras telas |
| **Descrição** | As mutations de `create`, `update` e `delete` de categorias fazem apenas `refetch()` da própria lista. Quando o usuário renomeia ou muda a cor de uma categoria, as páginas de Transações, Relatórios, Metas e Recorrências continuam exibindo o nome/cor antigos até a próxima navegação ou refresh, pois seus caches não são invalidados. |
| **Correção sugerida** | Adicionar invalidações de `transactions.list`, `reports.categoryBreakdown` e `goals.list` no `onSuccess` de `updateMutation` e `deleteMutation`. |

---

## 2. Débitos Técnicos

### 2.1 Código morto — `formatCurrency` em `lib/format.ts`

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `client/src/lib/format.ts` (linhas 1–16) |
| **Impacto** | Nenhum funcional — poluição de bundle |
| **Descrição** | A função `formatCurrency` não é mais importada por nenhum componente após a migração para `useCurrency().formatMoney`. Permanece exportada, aumentando o tamanho do bundle (embora marginalmente) e podendo confundir futuros desenvolvedores. |
| **Correção sugerida** | Remover a função ou marcá-la como `@deprecated`. |

---

### 2.2 Uso extensivo de `any` em estado e props

| Campo | Detalhe |
|-------|---------|
| **Arquivos afetados** | `Transactions.tsx:37`, `Categories.tsx:59`, `Recurring.tsx:53`, `Dashboard.tsx:131`, `Reports.tsx:20,32,47` |
| **Impacto** | Baixo — perda de segurança de tipo |
| **Descrição** | Três `useState<any>(null)` para estados de edição e múltiplos parâmetros `any` em componentes de tooltip do Recharts eliminam a proteção do TypeScript. Qualquer refatoração futura pode introduzir bugs silenciosos. |
| **Correção sugerida** | Criar tipos explícitos (ex: `EditingTransaction | null`) para os estados de edição. Para os tooltips do Recharts, usar `TooltipProps<number, string>` do pacote. |

---

### 2.3 `onValueChange={(v: any) => setTypeFilter(v)}` sem type assertion

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `client/src/pages/Transactions.tsx` (linha 133) |
| **Impacto** | Baixo — aceita qualquer string sem validação |
| **Descrição** | O `Select` de tipo de transação usa cast `any` para contornar a tipagem do Radix. Se o componente retornar um valor inesperado, o filtro não quebrará visivelmente mas enviará um valor inválido à query. |
| **Correção sugerida** | Usar `onValueChange={(v) => setTypeFilter(v as "all" | "income" | "expense")}` ou validar com um guard. |

---

### 2.4 Testes de `auth.updateCurrency` — cobertura superficial

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `server/auth.currency.test.ts` |
| **Impacto** | Baixo — falsa sensação de segurança |
| **Descrição** | Os 4 testes validam o retorno da procedure e o comportamento de acesso, mas não verificam se `updateUserCurrency` foi chamado com os argumentos corretos (`ctx.user.id`, moeda). Também não testam o cenário de falha do helper (ex: banco indisponível). O `beforeEach` importado na linha 1 não é utilizado. |
| **Correção sugerida** | Adicionar `expect(updateUserCurrency).toHaveBeenCalledWith(1, "BRL")` e um teste onde o mock rejeita para validar propagação de erro. Remover import não usado. |

---

### 2.5 Logging global duplicado em `main.tsx`

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `client/src/main.tsx` (linhas 32–46) |
| **Impacto** | Baixo — ruído no console |
| **Descrição** | O `queryCache` e `mutationCache` fazem `console.error` para **todo** erro de API, inclusive aqueles já tratados localmente com `toast.error` nos `onError` das mutations. Isso gera entradas duplicadas no console do navegador e pode confundir durante debugging. |
| **Correção sugerida** | Filtrar apenas erros não tratados (ex: verificar se a mutation tem `onError` definido) ou remover o `console.error` global e confiar nos toasts locais. |

---

## 3. Oportunidades de Otimização

### 3.1 `getMonthlyEvolution` — agregação em memória ao invés de SQL

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `server/db.ts` (linhas 276–310) |
| **Impacto** | Desempenho — cresce com volume de dados |
| **Descrição** | A função carrega **todas** as transações dos últimos N meses em memória e agrega em JavaScript. Para um usuário com milhares de transações, isso transfere dados desnecessários do banco. O comentário no código menciona "DATE_FORMAT issues in Drizzle GROUP BY" como justificativa. |
| **Correção sugerida** | Usar `sql\`DATE_FORMAT(date, '%Y-%m')\`` diretamente no SELECT com `sql.raw` no GROUP BY, ou usar `YEAR(date)` + `MONTH(date)` como colunas agrupadas para contornar a limitação do Drizzle. |

---

### 3.2 `getTransactions` — sem paginação nem limite

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `server/db.ts` (linhas 176–212) |
| **Impacto** | Desempenho — payload grande em meses movimentados |
| **Descrição** | A query retorna **todas** as transações do período filtrado sem `.limit()`. Para um mês com centenas de lançamentos, o payload JSON pode ficar pesado e a renderização lenta no frontend. |
| **Correção sugerida** | Implementar paginação cursor-based ou offset-based (ex: `limit: 100, offset`) com scroll infinito no frontend, ou ao menos um limite máximo de segurança (ex: `.limit(500)`). |

---

### 3.3 `getGoalsWithProgress` — duas queries separadas ao invés de JOIN

| Campo | Detalhe |
|-------|---------|
| **Arquivo** | `server/db.ts` (linhas 515–598) |
| **Impacto** | Desempenho — latência adicional de round-trip |
| **Descrição** | A função faz uma query para buscar as metas e outra para buscar os gastos por categoria, depois cruza em memória. Poderia ser feita com um único LEFT JOIN + subquery, reduzindo um round-trip ao banco. |
| **Correção sugerida** | Considerar uma CTE ou subquery que calcule os totais por categoria e faça JOIN direto com a tabela de metas. |

---

## Matriz de Priorização

| # | Achado | Severidade | Esforço | Prioridade |
|---|--------|-----------|---------|------------|
| 1.1 | TransactionModal moeda hardcoded | Alta | Baixo | **P1** |
| 1.2 | Recurring invalidação incompleta | Média | Baixo | **P1** |
| 1.3 | Transactions delete sem invalidar reports | Média | Baixo | **P1** |
| 1.4 | Categories sem invalidar caches | Baixa-Média | Baixo | **P2** |
| 2.1 | Código morto formatCurrency | Baixa | Trivial | **P3** |
| 2.2 | useState\<any\> e props any | Baixa | Médio | **P3** |
| 2.3 | onValueChange any | Baixa | Trivial | **P3** |
| 2.4 | Testes superficiais updateCurrency | Baixa | Baixo | **P2** |
| 2.5 | Logging global duplicado | Baixa | Baixo | **P3** |
| 3.1 | Agregação em memória | Média | Médio | **P2** |
| 3.2 | Sem paginação em transactions | Média | Médio | **P2** |
| 3.3 | Duas queries em goals | Baixa | Médio | **P3** |

---

## Conclusão

O projeto está em bom estado geral, com validações de ownership, tratamento de erros e separação de dados por usuário bem implementados. Os achados mais urgentes (P1) são todos de **consistência de cache** — situações onde uma mutation bem-sucedida não invalida todas as queries dependentes, deixando a UI temporariamente desatualizada. Esses são de correção rápida (adicionar 2–3 linhas de `invalidate()` em cada caso) e devem ser priorizados. O bug do símbolo de moeda hardcoded no modal também é de correção trivial e impacta diretamente a feature recém-entregue.
