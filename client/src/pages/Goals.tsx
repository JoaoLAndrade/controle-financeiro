import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Target, Plus, Pencil, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { formatCurrency, MONTH_NAMES } from "@/lib/format";

// ─── Schema ───────────────────────────────────────────────────────────────────

const goalSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100),
  targetAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Valor inválido (ex: 500.00)"),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function progressColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

function progressTextColor(pct: number): string {
  if (pct >= 100) return "text-red-500";
  if (pct >= 80) return "text-amber-500";
  return "text-emerald-500";
}

function statusLabel(pct: number): { label: string; icon: React.ReactNode } {
  if (pct >= 100)
    return { label: "Limite atingido", icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> };
  if (pct >= 80)
    return { label: "Atenção", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> };
  return { label: "No caminho", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> };
}

function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Goals() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: goalsData = [], isLoading } = trpc.goals.list.useQuery({ year, month });
  const { data: categories = [] } = trpc.categories.list.useQuery();

  const createGoal = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success("Meta criada com sucesso!");
      setModalOpen(false);
      reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateGoal = trpc.goals.update.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success("Meta atualizada!");
      setModalOpen(false);
      setEditingId(null);
      reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteGoal = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success("Meta excluída.");
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: { type: "expense" },
  });

  const typeValue = watch("type");
  const categoryIdValue = watch("categoryId");

  // Month navigation
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return; // don't go into the future
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function openCreate() {
    reset({ type: "expense", name: "", targetAmount: "", categoryId: undefined });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(goal: (typeof goalsData)[0]) {
    reset({
      name: goal.name,
      targetAmount: goal.targetAmount,
      type: goal.type,
      categoryId: goal.categoryId ? String(goal.categoryId) : undefined,
    });
    setEditingId(goal.id);
    setModalOpen(true);
  }

  function onSubmit(data: GoalFormData) {
    const payload = {
      name: data.name,
      targetAmount: data.targetAmount,
      type: data.type,
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      yearMonth: toYearMonth(year, month),
    };
    if (editingId !== null) {
      updateGoal.mutate({ id: editingId, ...payload });
    } else {
      createGoal.mutate(payload);
    }
  }

  // Summary stats
  const total = goalsData.length;
  const onTrack = goalsData.filter((g) => g.percentage < 80).length;
  const warning = goalsData.filter((g) => g.percentage >= 80 && g.percentage < 100).length;
  const exceeded = goalsData.filter((g) => g.percentage >= 100).length;

  const monthLabel = `${MONTH_NAMES[month - 1]} de ${year}`;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Metas Financeiras</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Limites mensais por categoria
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 h-9">
          <Plus className="w-4 h-4" />
          Nova Meta
        </Button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-foreground min-w-[140px] text-center capitalize">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isCurrentMonth && (
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
            className="text-xs text-primary hover:underline ml-1"
          >
            Voltar ao mês atual
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total de Metas", value: total, color: "text-foreground" },
          { label: "No Caminho", value: onTrack, color: "text-emerald-500" },
          { label: "Atenção (≥80%)", value: warning, color: "text-amber-500" },
          { label: "Limite Atingido", value: exceeded, color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Goals list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : goalsData.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Target className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">
              Nenhuma meta para {monthLabel}
            </p>
            <p className="text-sm text-muted-foreground/70">
              Crie metas mensais por categoria para acompanhar seus gastos.
            </p>
            <Button variant="outline" onClick={openCreate} className="mt-2 gap-2">
              <Plus className="w-4 h-4" />
              Criar meta para este mês
            </Button>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-3">
            {goalsData.map((goal) => {
              const pct = Math.min(goal.percentage, 100);
              const { label, icon } = statusLabel(goal.percentage);
              const catColor = goal.categoryColor ?? "#6366f1";

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-border/60 hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: catColor }}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{goal.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {goal.categoryId
                                ? (goal.categoryName ?? "Sem categoria")
                                : "Total do tipo"}{" "}
                              ·{" "}
                              {goal.type === "expense" ? (
                                <span className="inline-flex items-center gap-0.5">
                                  <TrendingDown className="w-3 h-3 text-red-400" /> Despesa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5">
                                  <TrendingUp className="w-3 h-3 text-emerald-400" /> Receita
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(goal)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => setDeleteId(goal.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {icon}
                            {label}
                          </span>
                          <span className={`font-semibold ${progressTextColor(goal.percentage)}`}>
                            {goal.percentage}%
                          </span>
                        </div>
                        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progressColor(goal.percentage)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Gasto:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(parseFloat(goal.spent))}
                            </span>
                          </span>
                          <span>
                            Limite:{" "}
                            <span className="font-medium text-foreground">
                              {formatCurrency(parseFloat(goal.targetAmount))}
                            </span>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Create / Edit Modal */}
      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) { setEditingId(null); reset(); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId !== null ? "Editar Meta" : "Nova Meta"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Month info banner */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary font-medium">
              Meta para: <span className="capitalize">{monthLabel}</span>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Nome da Meta</Label>
              <Input
                id="goal-name"
                placeholder="ex: Limite de alimentação"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={typeValue}
                onValueChange={(v) => setValue("type", v as "income" | "expense")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Categoria (opcional)</Label>
              <Select
                value={categoryIdValue ?? "none"}
                onValueChange={(v) =>
                  setValue("categoryId", v === "none" ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Total do tipo (sem filtro)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Total do tipo (sem filtro)</SelectItem>
                  {categories
                    .filter((c) => c.type === typeValue || c.type === "both")
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Sem categoria = rastreia o total de {typeValue === "expense" ? "despesas" : "receitas"} do mês.
              </p>
            </div>

            {/* Target Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-amount">Limite (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  id="goal-amount"
                  className="pl-9"
                  placeholder="0.00"
                  {...register("targetAmount")}
                />
              </div>
              {errors.targetAmount && (
                <p className="text-xs text-red-500">{errors.targetAmount.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setModalOpen(false); setEditingId(null); reset(); }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createGoal.isPending || updateGoal.isPending}
              >
                {editingId !== null ? "Salvar" : "Criar Meta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteId !== null && deleteGoal.mutate({ id: deleteId })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
