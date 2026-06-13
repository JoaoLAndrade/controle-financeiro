import { trpc } from "@/lib/trpc";
import {
  formatDate,
  getCurrentMonthYear,
  formatMonthYear,
  formatShortMonth,
} from "@/lib/format";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Plus,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  GripVertical,
  Eye,
  EyeOff,
  X,
  Check,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type TooltipProps,
} from "recharts";
import { useMemo, useState } from "react";
import TransactionModal from "@/components/TransactionModal";
import { Link } from "wouter";
import { toast } from "sonner";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────────────────────

type WidgetId = "summary" | "chart" | "recent" | "goals";

const WIDGET_LABELS: Record<WidgetId, string> = {
  summary: "Resumo Financeiro",
  chart: "Evolução dos Últimos 6 Meses",
  recent: "Transações Recentes",
  goals: "Metas do Mês",
};

const DEFAULT_ORDER: WidgetId[] = ["summary", "chart", "recent", "goals"];

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  title,
  value,
  icon: Icon,
  trendLabel,
  colorClass,
  bgClass,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trendLabel?: string;
  colorClass: string;
  bgClass: string;
  loading?: boolean;
}) {
  return (
    <Card className="card-shadow border-border/60 hover:card-shadow-hover transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className={cn("text-2xl font-semibold font-display", colorClass)}>
                {value}
              </p>
            )}
          </div>
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              bgClass
            )}
          >
            <Icon className={cn("w-5 h-5", colorClass)} />
          </div>
        </div>
        {trendLabel && (
          <p className="mt-3 text-xs text-muted-foreground">{trendLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}// ─── Custom Tooltip ───────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  const { formatMoney } = useCurrency();
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {formatMoney(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}// ─── Sortable Edit Row ────────────────────────────────────────────────────────

function SortableWidgetRow({
  id,
  hidden,
  onToggle,
}: {
  id: WidgetId;
  hidden: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
        isDragging
          ? "bg-accent border-primary/30 shadow-md"
          : "bg-card border-border/50 hover:bg-muted/30"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none"
        title="Arrastar para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span
        className={cn(
          "flex-1 text-sm font-medium",
          hidden && "text-muted-foreground line-through"
        )}
      >
        {WIDGET_LABELS[id]}
      </span>

      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",
          hidden
            ? "text-muted-foreground hover:text-foreground hover:bg-muted"
            : "text-foreground hover:bg-muted"
        )}
        title={hidden ? "Mostrar widget" : "Ocultar widget"}
      >
        {hidden ? (
          <EyeOff className="w-3.5 h-3.5" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {hidden ? "Oculto" : "Visível"}
        </span>
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { formatMoney, currency } = useCurrency();
  const { year, month } = getCurrentMonthYear();
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [draftOrder, setDraftOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
  const [draftHidden, setDraftHidden] = useState<WidgetId[]>([]);

  const { data: prefs } = trpc.dashboard.getPrefs.useQuery(undefined);

  const utils = trpc.useUtils();
  const savePrefs = trpc.dashboard.savePrefs.useMutation({
    onSuccess: () => {
      utils.dashboard.getPrefs.invalidate();
      setEditMode(false);
      toast.success("Layout do Dashboard salvo!");
    },
    onError: (e) => toast.error(e.message),
  });

  const activeOrder = editMode
    ? draftOrder
    : (prefs?.widgetOrder as WidgetId[] | undefined) ?? DEFAULT_ORDER;
  const activeHidden = editMode
    ? draftHidden
    : (prefs?.hiddenWidgets as WidgetId[] | undefined) ?? [];

  // Data queries
  const { data: summary, isLoading: summaryLoading } =
    trpc.reports.summary.useQuery({ year, month });
  const { data: balance, isLoading: balanceLoading } =
    trpc.reports.totalBalance.useQuery();
  const { data: evolution, isLoading: evolutionLoading } =
    trpc.reports.monthlyEvolution.useQuery({ months: 6 });
  const { data: recentTxs, isLoading: txLoading } =
    trpc.transactions.list.useQuery({
      startDate: new Date(year, month - 1, 1),
      endDate: new Date(year, month, 0, 23, 59, 59),
    });
  const { data: goalsData = [], isLoading: goalsLoading } =
    trpc.goals.list.useQuery({ year, month });

  const onSuccess = () => {
    utils.reports.summary.invalidate();
    utils.reports.totalBalance.invalidate();
    utils.reports.monthlyEvolution.invalidate();
    utils.transactions.list.invalidate();
    utils.goals.list.invalidate();
  };

  const chartData = useMemo(() => {
    const skeleton = new Map<
      string,
      { month: string; Receitas: number; Despesas: number }
    >();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      skeleton.set(key, {
        month: formatShortMonth(key),
        Receitas: 0,
        Despesas: 0,
      });
    }
    if (evolution) {
      for (const row of evolution) {
        const entry = skeleton.get(row.month);
        if (!entry) continue;
        if (row.type === "income")
          entry.Receitas = parseFloat(row.total ?? "0");
        else entry.Despesas = parseFloat(row.total ?? "0");
      }
    }
    return Array.from(skeleton.values());
  }, [evolution]);

  const income = parseFloat(summary?.income ?? "0");
  const expense = parseFloat(summary?.expense ?? "0");
  const bal = parseFloat(balance ?? "0");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDraftOrder((items) => {
        const oldIndex = items.indexOf(active.id as WidgetId);
        const newIndex = items.indexOf(over.id as WidgetId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function toggleHidden(id: WidgetId) {
    setDraftHidden((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  }

  function openEdit() {
    setDraftOrder(
      (prefs?.widgetOrder as WidgetId[] | undefined) ?? DEFAULT_ORDER
    );
    setDraftHidden(
      (prefs?.hiddenWidgets as WidgetId[] | undefined) ?? []
    );
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
  }

  function saveEdit() {
    savePrefs.mutate({ widgetOrder: draftOrder, hiddenWidgets: draftHidden });
  }

  // ─── Individual widget renderers ──────────────────────────────────────────

  function WidgetSummary() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          title="Saldo Total"
          value={formatMoney(bal)}
          icon={Wallet}
          colorClass={bal >= 0 ? "text-foreground" : "text-expense"}
          bgClass="bg-secondary"
          loading={balanceLoading}
          trendLabel="Saldo acumulado de todas as transações"
        />
        <SummaryCard
          title="Receitas do Mês"
          value={formatMoney(income)}
          icon={TrendingUp}
          colorClass="text-income"
          bgClass="bg-income-soft"
          loading={summaryLoading}
          trendLabel={`Entradas em ${formatMonthYear(year, month)}`}
        />
        <SummaryCard
          title="Despesas do Mês"
          value={formatMoney(expense)}
          icon={TrendingDown}
          colorClass="text-expense"
          bgClass="bg-expense-soft"
          loading={summaryLoading}
          trendLabel={`Saídas em ${formatMonthYear(year, month)}`}
        />
      </div>
    );
  }

  function WidgetChart() {
    return (
      <Card className="card-shadow border-border/60">
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
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorReceitas"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--income)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--income)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="colorDespesas"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--expense)"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--expense)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${currency === 'BRL' ? 'R$' : '$'}\u00a0${(v / 1000).toFixed(0)}k` : formatMoney(v)}
                  width={44}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="Receitas"
                  stroke="var(--income)"
                  strokeWidth={2}
                  fill="url(#colorReceitas)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="Despesas"
                  stroke="var(--expense)"
                  strokeWidth={2}
                  fill="url(#colorDespesas)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    );
  }

  function WidgetRecent() {
    return (
      <Card className="card-shadow border-border/60">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Transações Recentes
          </CardTitle>
          <Link
            href="/transacoes"
            className="text-xs text-primary hover:underline font-medium"
          >
            Ver todas
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {txLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !recentTxs?.length ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ArrowLeftRight className="w-7 h-7 opacity-30" />
              <p className="text-sm">Nenhuma transação este mês.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTxs.slice(0, 8).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      tx.type === "income" ? "bg-income-soft" : tx.type === "transfer" ? "bg-blue-100 dark:bg-blue-900/30" : "bg-expense-soft"
                    )}
                  >
                    {tx.type === "income" ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-income" />
                    ) : tx.type === "transfer" ? (
                      <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-expense" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.date)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold flex-shrink-0",
                      tx.type === "income" ? "text-income" : tx.type === "transfer" ? "text-blue-500" : "text-expense"
                    )}
                  >
                    {tx.type === "income" ? "+" : tx.type === "transfer" ? "" : "-"}
                    {formatMoney(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function WidgetGoals() {
    return (
      <Card className="card-shadow border-border/60">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Metas do Mês
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatMonthYear(year, month)}
              </p>
            </div>
          </div>
          <Link
            href="/metas"
            className="text-xs text-primary hover:underline font-medium"
          >
            Gerenciar
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {goalsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : goalsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
                <Target className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nenhuma meta este mês
                </p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Defina limites mensais para controlar seus gastos
                </p>
              </div>
              <Link href="/metas">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                >
                  <Target className="w-3.5 h-3.5" />
                  Criar metas
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4 px-1">
                {[
                  {
                    label: "No caminho",
                    count: goalsData.filter((g) => g.percentage < 80).length,
                    color: "text-emerald-500",
                    dot: "bg-emerald-500",
                  },
                  {
                    label: "Atenção",
                    count: goalsData.filter(
                      (g) => g.percentage >= 80 && g.percentage < 100
                    ).length,
                    color: "text-amber-500",
                    dot: "bg-amber-500",
                  },
                  {
                    label: "Atingido",
                    count: goalsData.filter((g) => g.percentage >= 100).length,
                    color: "text-red-500",
                    dot: "bg-red-500",
                  },
                ].map(({ label, count, color, dot }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", dot)} />
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                    <span className={cn("text-xs font-bold", color)}>
                      {count}
                    </span>
                  </div>
                ))}
                <div className="ml-auto text-xs text-muted-foreground">
                  {goalsData.length} meta{goalsData.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="space-y-2.5">
                {goalsData.slice(0, 6).map((goal) => {
                  const pct = Math.min(goal.percentage, 100);
                  const isExceeded = goal.percentage >= 100;
                  const isAlert =
                    goal.percentage >= 80 && !isExceeded;
                  const catColor = goal.categoryColor ?? "#6366f1";
                  const remaining =
                    parseFloat(goal.targetAmount) -
                    parseFloat(goal.spent);
                  return (
                    <div
                      key={goal.id}
                      className={cn(
                        "rounded-xl p-3.5 border transition-all duration-200",
                        isExceeded
                          ? "border-red-500/25 bg-red-500/5"
                          : isAlert
                          ? "border-amber-500/25 bg-amber-500/5"
                          : "border-border/50 bg-muted/20 hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: catColor }}
                          />
                          <p className="text-sm font-semibold text-foreground truncate">
                            {goal.name}
                          </p>
                          {goal.categoryName && (
                            <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                              · {goal.categoryName}
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                            isExceeded
                              ? "bg-red-500/15 text-red-500"
                              : isAlert
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-emerald-500/15 text-emerald-500"
                          )}
                        >
                          {isExceeded || isAlert ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {goal.percentage}%
                        </div>
                      </div>
                      <div className="relative h-2 w-full rounded-full bg-muted/60 overflow-hidden mb-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            isExceeded
                              ? "bg-red-500"
                              : isAlert
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Gasto:{" "}
                          <span className="font-medium text-foreground">
                            {formatMoney(parseFloat(goal.spent))}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Limite:{" "}
                          <span className="font-medium text-foreground">
                            {formatMoney(parseFloat(goal.targetAmount))}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            isExceeded
                              ? "text-red-500"
                              : isAlert
                              ? "text-amber-500"
                              : "text-muted-foreground"
                          )}
                        >
                          {isExceeded
                            ? `+${formatMoney(Math.abs(remaining))} acima`
                            : `${formatMoney(remaining)} restante`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {goalsData.length > 6 && (
                <div className="mt-3 text-center">
                  <Link
                    href="/metas"
                    className="text-xs text-primary hover:underline"
                  >
                    Ver mais {goalsData.length - 6} meta
                    {goalsData.length - 6 !== 1 ? "s" : ""}
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const widgetComponents: Record<WidgetId, React.ReactNode> = {
    summary: <WidgetSummary />,
    chart: <WidgetChart />,
    recent: <WidgetRecent />,
    goals: <WidgetGoals />,
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Visão Geral
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatMonthYear(year, month)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEdit}
                className="gap-1.5 h-9"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={savePrefs.isPending}
                className="gap-1.5 h-9"
              >
                <Check className="w-3.5 h-3.5" />
                Salvar Layout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={openEdit}
                className="gap-1.5 h-9"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Editar Dashboard
              </Button>
              <Button onClick={() => setModalOpen(true)} className="gap-2 h-9">
                <Plus className="w-4 h-4" />
                Nova Transação
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode panel */}
      {editMode && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Personalizar Dashboard
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Arraste para reordenar os widgets. Clique em "Visível" para
              ocultar ou mostrar.
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={draftOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {draftOrder.map((id) => (
                    <SortableWidgetRow
                      key={id}
                      id={id}
                      hidden={draftHidden.includes(id)}
                      onToggle={() => toggleHidden(id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      )}

      {/* Widgets rendered in active order */}
      {activeOrder.map((id) => {
        const isHidden = activeHidden.includes(id);

        // In edit mode: show all widgets, hidden ones are dimmed
        if (editMode) {
          return (
            <div
              key={id}
              className={cn(
                "transition-opacity duration-200",
                isHidden && "opacity-40 pointer-events-none select-none"
              )}
            >
              {widgetComponents[id]}
            </div>
          );
        }

        // Normal mode: skip hidden widgets
        if (isHidden) return null;

        return <div key={id}>{widgetComponents[id]}</div>;
      })}

      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={onSuccess}
      />
    </div>
  );
}
