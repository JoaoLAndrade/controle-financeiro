import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getCurrentMonthYear, formatMonthYear, formatShortMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  ArrowLeftRight, Plus, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { useMemo, useState } from "react";
import TransactionModal from "@/components/TransactionModal";
import { Link } from "wouter";

function SummaryCard({
  title, value, icon: Icon, trend, trendLabel, colorClass, bgClass, loading
}: {
  title: string; value: string; icon: React.ElementType;
  trend?: number; trendLabel?: string;
  colorClass: string; bgClass: string; loading?: boolean;
}) {
  return (
    <Card className="card-shadow border-border/60 hover:card-shadow-hover transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className={cn("text-2xl font-semibold font-display", colorClass)}>{value}</p>
            )}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", bgClass)}>
            <Icon className={cn("w-5 h-5", colorClass)} />
          </div>
        </div>
        {trendLabel && (
          <p className="mt-3 text-xs text-muted-foreground">{trendLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { year, month } = getCurrentMonthYear();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading } = trpc.reports.summary.useQuery({ year, month });
  const { data: balance, isLoading: balanceLoading } = trpc.reports.totalBalance.useQuery();
  const { data: evolution, isLoading: evolutionLoading } = trpc.reports.monthlyEvolution.useQuery({ months: 6 });
  const { data: recentTxs, isLoading: txLoading } = trpc.transactions.list.useQuery({
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0, 23, 59, 59),
  });

  const utils = trpc.useUtils();

  const onSuccess = () => {
    utils.reports.summary.invalidate();
    utils.reports.totalBalance.invalidate();
    utils.reports.monthlyEvolution.invalidate();
    utils.transactions.list.invalidate();
  };

  const chartData = useMemo(() => {
    // Build a full 6-month skeleton so months without transactions still appear
    const skeleton = new Map<string, { month: string; Receitas: number; Despesas: number }>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      skeleton.set(key, { month: formatShortMonth(key), Receitas: 0, Despesas: 0 });
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

  const income = parseFloat(summary?.income ?? "0");
  const expense = parseFloat(summary?.expense ?? "0");
  const bal = parseFloat(balance ?? "0");

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatMonthYear(year, month)}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 h-9">
          <Plus className="w-4 h-4" />
          Nova Transação
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Saldo Total"
          value={formatCurrency(bal)}
          icon={Wallet}
          colorClass={bal >= 0 ? "text-foreground" : "text-expense"}
          bgClass="bg-secondary"
          loading={balanceLoading}
          trendLabel="Saldo acumulado de todas as transações"
        />
        <SummaryCard
          title="Receitas do Mês"
          value={formatCurrency(income)}
          icon={TrendingUp}
          colorClass="text-income"
          bgClass="bg-income-soft"
          loading={summaryLoading}
          trendLabel={`Entradas em ${formatMonthYear(year, month)}`}
        />
        <SummaryCard
          title="Despesas do Mês"
          value={formatCurrency(expense)}
          icon={TrendingDown}
          colorClass="text-expense"
          bgClass="bg-expense-soft"
          loading={summaryLoading}
          trendLabel={`Saídas em ${formatMonthYear(year, month)}`}
        />
      </div>

      {/* Chart + Recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Evolution chart */}
        <Card className="lg:col-span-3 card-shadow border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Evolução dos Últimos 6 Meses
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {evolutionLoading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : chartData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ArrowLeftRight className="w-8 h-8 opacity-30" />
                <p className="text-sm">Nenhuma transação registrada ainda.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--income)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--income)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--expense)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--expense)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="Receitas" stroke="var(--income)" strokeWidth={2} fill="url(#colorReceitas)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="Despesas" stroke="var(--expense)" strokeWidth={2} fill="url(#colorDespesas)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card className="lg:col-span-2 card-shadow border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">
              Transações Recentes
            </CardTitle>
            <Link href="/transacoes" className="text-xs text-primary hover:underline font-medium">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {txLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : !recentTxs?.length ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ArrowLeftRight className="w-7 h-7 opacity-30" />
                <p className="text-sm">Nenhuma transação este mês.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTxs.slice(0, 8).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      tx.type === "income" ? "bg-income-soft" : "bg-expense-soft"
                    )}>
                      {tx.type === "income"
                        ? <ArrowUpRight className="w-3.5 h-3.5 text-income" />
                        : <ArrowDownRight className="w-3.5 h-3.5 text-expense" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                    <p className={cn(
                      "text-sm font-semibold flex-shrink-0",
                      tx.type === "income" ? "text-income" : "text-expense"
                    )}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={onSuccess} />
    </div>
  );
}
