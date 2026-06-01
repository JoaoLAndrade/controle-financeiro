import { trpc } from "@/lib/trpc";
import { formatDate, MONTH_NAMES } from "@/lib/format";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, Filter, Loader2, MoreHorizontal,
  Pencil, Plus, Search, Trash2, X
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TransactionModal from "@/components/TransactionModal";

type EditingTransaction = {
  id: number;
  type: "income" | "expense";
  amount: string;
  date: Date;
  description: string;
  categoryId: number | null;
};

export default function Transactions() {
  const { formatMoney } = useCurrency();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<EditingTransaction | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const startDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const endDate = useMemo(() => new Date(year, month, 0, 23, 59, 59), [year, month]);

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: transactions, isLoading, isError, refetch } = trpc.transactions.list.useQuery({
    startDate,
    endDate,
    type: typeFilter === "all" ? undefined : typeFilter,
    categoryId: categoryFilter !== "all" ? parseInt(categoryFilter) : undefined,
  });

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success("Transação excluída.");
      setDeletingId(null);
      refetch();
      utils.reports.summary.invalidate();
      utils.reports.totalBalance.invalidate();
      utils.reports.monthlyEvolution.invalidate();
      utils.reports.categoryBreakdown.invalidate();
      utils.goals.list.invalidate();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const utils = trpc.useUtils();
  const onSuccess = () => {
    refetch();
    utils.reports.summary.invalidate();
    utils.reports.totalBalance.invalidate();
    utils.reports.monthlyEvolution.invalidate();
    utils.reports.categoryBreakdown.invalidate();
    utils.goals.list.invalidate();
  };

  const filtered = useMemo(() => {
    if (!transactions) return [];
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        (t.categoryName?.toLowerCase().includes(q) ?? false)
    );
  }, [transactions, search]);

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Transações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie todas as suas receitas e despesas
          </p>
        </div>
        <Button onClick={() => { setEditingTx(null); setModalOpen(true); }} className="gap-2 h-9">
          <Plus className="w-4 h-4" />
          Nova Transação
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-shadow border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />

            {/* Month */}
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year */}
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "income" | "expense")}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar transações..."
                className="h-8 pl-8 text-xs"
              />
              {search && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary row */}
      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{filtered.length} transações</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-2 h-2 rounded-full bg-income" />
            <span className="text-muted-foreground">Receitas:</span>
            <span className="font-semibold text-income">{formatMoney(totalIncome)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <div className="w-2 h-2 rounded-full bg-expense" />
            <span className="text-muted-foreground">Despesas:</span>
            <span className="font-semibold text-expense">{formatMoney(totalExpense)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Saldo:</span>
            <span className={cn("font-semibold", totalIncome - totalExpense >= 0 ? "text-income" : "text-expense")}>
              {formatMoney(totalIncome - totalExpense)}
            </span>
          </div>
        </div>
      )}

      {/* Transactions list */}
      <Card className="card-shadow border-border/60 overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-destructive gap-3">
            <p className="text-sm font-medium">Erro ao carregar transações. Tente recarregar a página.</p>
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm text-foreground">Nenhuma transação encontrada</p>
              <p className="text-xs mt-1">Tente ajustar os filtros ou adicione uma nova transação.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group"
              >
                {/* Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                  tx.type === "income" ? "bg-income-soft" : "bg-expense-soft"
                )}>
                  {tx.type === "income"
                    ? <ArrowUpRight className="w-4 h-4 text-income" />
                    : <ArrowDownRight className="w-4 h-4 text-expense" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    {tx.categoryName && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 hidden sm:flex"
                        style={{ background: `${tx.categoryColor}20`, color: tx.categoryColor ?? undefined }}
                      >
                        {tx.categoryName}
                      </Badge>
                    )}
                    {tx.recurringId && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 hidden sm:flex gap-0.5">
                        <CalendarClock className="w-2.5 h-2.5" />
                        Recorrente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.date)}</p>
                </div>

                {/* Amount */}
                <p className={cn(
                  "text-sm font-semibold flex-shrink-0",
                  tx.type === "income" ? "text-income" : "text-expense"
                )}>
                  {tx.type === "income" ? "+" : "-"}{formatMoney(parseFloat(tx.amount))}
                </p>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 opacity-60 hover:opacity-100 transition-opacity text-muted-foreground"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() => { setEditingTx(tx); setModalOpen(true); }}
                      className="gap-2 text-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeletingId(tx.id)}
                      className="gap-2 text-sm text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      <TransactionModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingTx(null); }}
        onSuccess={onSuccess}
        transaction={editingTx ?? undefined}
      />

      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => deletingId !== null && deleteMutation.mutate({ id: deletingId })}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
