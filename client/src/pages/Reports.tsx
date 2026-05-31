import { trpc } from "@/lib/trpc";
import { formatMonthYear, getCurrentMonthYear, MONTH_NAMES } from "@/lib/format";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  BarChart3, TrendingDown, TrendingUp, Wallet, ArrowLeftRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function CustomPieTooltip({ active, payload }: any) {
  const { formatMoney } = useCurrency();
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
        <span className="font-medium text-foreground">{name}</span>
      </div>
      <p className="text-muted-foreground">{formatMoney(value)}</p>
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: any) {
  const { formatMoney } = useCurrency();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.fill }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{formatMoney(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const { formatMoney, currency } = useCurrency();
  const now = getCurrentMonthYear();
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.month);

  const { data: summary, isLoading: summaryLoading, isError: summaryError } = trpc.reports.summary.useQuery({ year, month });
  const { data: breakdown, isLoading: breakdownLoading, isError: breakdownError } = trpc.reports.categoryBreakdown.useQuery({ year, month });
  const { data: evolution, isLoading: evolutionLoading, isError: evolutionError } = trpc.reports.monthlyEvolution.useQuery({ months: 12 });
  const hasError = summaryError || breakdownError || evolutionError;

  const income = parseFloat(summary?.income ?? "0");
  const expense = parseFloat(summary?.expense ?? "0");
  const balance = income - expense;

  // Pie chart data for expenses by category
  const expensePieData = useMemo(() => {
    if (!breakdown) return [];
    return breakdown
      .filter((r) => r.type === "expense")
      .map((r) => ({
        name: r.categoryName ?? "Sem categoria",
        value: parseFloat(r.total ?? "0"),
        color: r.categoryColor ?? "#94a3b8",
      }))
      .filter((r) => r.value > 0);
  }, [breakdown]);

  // Pie chart data for income by category
  const incomePieData = useMemo(() => {
    if (!breakdown) return [];
    return breakdown
      .filter((r) => r.type === "income")
      .map((r) => ({
        name: r.categoryName ?? "Sem categoria",
        value: parseFloat(r.total ?? "0"),
        color: r.categoryColor ?? "#94a3b8",
      }))
      .filter((r) => r.value > 0);
  }, [breakdown]);

  // Bar chart data for evolution — always show 12 months even without transactions
  const barData = useMemo(() => {
    const skeleton = new Map<string, { month: string; Receitas: number; Despesas: number }>();
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d);
      skeleton.set(key, { month: label, Receitas: 0, Despesas: 0 });
    }
    if (evolution) {
      for (const row of evolution) {
        const entry = skeleton.get(row.month);
        if (!entry) continue;
        if (row.type === "income") entry.Receitas = parseFloat(row.total ?? "0");
        else entry.Despesas = parseFloat(row.total ?? "0");
      }
    }
    return Array.from(skeleton.values());
  }, [evolution]);

  const years = Array.from({ length: 5 }, (_, i) => now.year - i);
  const currencySymbol = currency === "BRL" ? "R$" : "$";

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Relatório Mensal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise detalhada de {formatMonthYear(year, month)}
          </p>
        </div>

        {/* Month/Year selector */}
        <div className="flex gap-2">
          <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="h-9 w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar alguns dados do relatório. Tente recarregar a página.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Receitas",
            value: income,
            icon: TrendingUp,
            colorClass: "text-income",
            bgClass: "bg-income-soft",
          },
          {
            label: "Despesas",
            value: expense,
            icon: TrendingDown,
            colorClass: "text-expense",
            bgClass: "bg-expense-soft",
          },
          {
            label: "Saldo do Mês",
            value: balance,
            icon: Wallet,
            colorClass: balance >= 0 ? "text-income" : "text-expense",
            bgClass: "bg-secondary",
          },
        ].map(({ label, value, icon: Icon, colorClass, bgClass }) => (
          <Card key={label} className="card-shadow border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", bgClass)}>
                <Icon className={cn("w-5 h-5", colorClass)} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-28 mt-1" />
                ) : (
                  <p className={cn("text-xl font-semibold font-display mt-0.5", colorClass)}>
                    {formatMoney(value)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by category */}
        <Card className="card-shadow border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-expense" />
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : expensePieData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ArrowLeftRight className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhuma despesa registrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {expensePieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {expensePieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                        <span className="text-muted-foreground truncate">{entry.name}</span>
                      </div>
                      <span className="font-medium text-foreground flex-shrink-0 ml-2">
                        {formatMoney(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income by category */}
        <Card className="card-shadow border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-income" />
              Receitas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownLoading ? (
              <Skeleton className="h-64 w-full rounded-lg" />
            ) : incomePieData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ArrowLeftRight className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhuma receita registrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={incomePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {incomePieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {incomePieData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                        <span className="text-muted-foreground truncate">{entry.name}</span>
                      </div>
                      <span className="font-medium text-foreground flex-shrink-0 ml-2">
                        {formatMoney(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Annual evolution bar chart */}
      <Card className="card-shadow border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            Receitas vs. Despesas — Últimos 12 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {evolutionLoading ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : barData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BarChart3 className="w-8 h-8 opacity-30" />
              <p className="text-sm">Nenhum dado disponível ainda.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${currencySymbol}\u00a0${(v / 1000).toFixed(0)}k` : formatMoney(v)} width={56} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Receitas" fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Despesas" fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
