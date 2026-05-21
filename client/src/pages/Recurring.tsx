import { trpc } from "@/lib/trpc";
import { formatCurrency, CATEGORY_ICONS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, Loader2,
  MoreHorizontal, Pencil, Plus, RefreshCw, Trash2, ToggleLeft, ToggleRight
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  name: z.string().min(1, "Informe o nome").max(255),
  amount: z.string().min(1, "Informe o valor").regex(/^\d+([.,]\d{1,2})?$/, "Valor inválido"),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().optional(),
  dayOfMonth: z.coerce.number().min(1, "Mínimo 1").max(31, "Máximo 31"),
});

type FormValues = z.infer<typeof schema>;

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

export default function Recurring() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: recurring, isLoading, refetch } = trpc.recurring.list.useQuery();
  const { data: categories } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();

  const now = new Date();

  const generateMutation = trpc.recurring.generateForMonth.useMutation({
    onSuccess: (count) => {
      if (count > 0) {
        toast.success(`${count} transação(ões) gerada(s) para ${now.toLocaleString("pt-BR", { month: "long", year: "numeric" })}!`);
        utils.transactions.list.invalidate();
        utils.reports.totalBalance.invalidate();
        utils.reports.summary.invalidate();
        utils.reports.monthlyEvolution.invalidate();
      } else {
        toast.info("Nenhuma nova transação para gerar este mês.");
      }
      refetch();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const toggleMutation = trpc.recurring.update.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = trpc.recurring.delete.useMutation({
    onSuccess: () => { toast.success("Recorrência excluída."); setDeletingId(null); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: "", amount: "", type: "expense", categoryId: undefined, dayOfMonth: 1 },
  });

  useEffect(() => {
    if (modalOpen) {
      if (editingRec) {
        form.reset({
          name: editingRec.name,
          amount: parseFloat(editingRec.amount).toFixed(2).replace(".", ","),
          type: editingRec.type,
          categoryId: editingRec.categoryId?.toString() ?? undefined,
          dayOfMonth: editingRec.dayOfMonth,
        });
      } else {
        form.reset({ name: "", amount: "", type: "expense", categoryId: undefined, dayOfMonth: 1 });
      }
    }
  }, [modalOpen, editingRec]);

  const createMutation = trpc.recurring.create.useMutation({
    onSuccess: () => { toast.success("Recorrência criada!"); setModalOpen(false); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateMutation = trpc.recurring.update.useMutation({
    onSuccess: () => { toast.success("Recorrência atualizada!"); setModalOpen(false); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    const amount = values.amount.replace(",", ".");
    const categoryId = values.categoryId ? parseInt(values.categoryId) : null;
    if (editingRec) {
      updateMutation.mutate({ id: editingRec.id, name: values.name, amount, type: values.type, categoryId, dayOfMonth: values.dayOfMonth });
    } else {
      createMutation.mutate({ name: values.name, amount, type: values.type, categoryId, dayOfMonth: values.dayOfMonth });
    }
  };

  const selectedType = form.watch("type");
  const filteredCategories = categories?.filter((c) => c.type === selectedType || c.type === "both") ?? [];

  const activeCount = recurring?.filter((r) => r.active === "yes").length ?? 0;
  const totalMonthly = recurring
    ?.filter((r) => r.active === "yes")
    .reduce((sum, r) => {
      const v = parseFloat(r.amount);
      return r.type === "income" ? sum + v : sum - v;
    }, 0) ?? 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Recorrências</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lançamentos fixos gerados automaticamente todo mês
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 h-9 text-sm"
            onClick={() => generateMutation.mutate({ year: now.getFullYear(), month: now.getMonth() + 1 })}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />
            }
            Gerar este mês
          </Button>
          <Button onClick={() => { setEditingRec(null); setModalOpen(true); }} className="gap-2 h-9">
            <Plus className="w-4 h-4" />
            Nova Recorrência
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && (recurring?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="card-shadow border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <CalendarClock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total</p>
                <p className="text-lg font-semibold font-display">{recurring?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-income-soft flex items-center justify-center">
                <ToggleRight className="w-4 h-4 text-income" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ativas</p>
                <p className="text-lg font-semibold font-display text-income">{activeCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-shadow border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", totalMonthly >= 0 ? "bg-income-soft" : "bg-expense-soft")}>
                <ArrowUpRight className={cn("w-4 h-4", totalMonthly >= 0 ? "text-income" : "text-expense")} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Impacto mensal</p>
                <p className={cn("text-lg font-semibold font-display", totalMonthly >= 0 ? "text-income" : "text-expense")}>
                  {totalMonthly >= 0 ? "+" : ""}{formatCurrency(Math.abs(totalMonthly))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <Card className="card-shadow border-border/60 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(4)].map((_, i) => (
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
        ) : !recurring?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <CalendarClock className="w-5 h-5 opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm text-foreground">Nenhuma recorrência cadastrada</p>
              <p className="text-xs mt-1">Adicione lançamentos fixos como aluguel, salário ou assinaturas.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setEditingRec(null); setModalOpen(true); }} className="gap-2 mt-2">
              <Plus className="w-3.5 h-3.5" />
              Criar primeira recorrência
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recurring.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  "flex items-center gap-4 px-5 py-3.5 transition-colors group",
                  rec.active === "yes" ? "hover:bg-muted/30" : "opacity-50 hover:bg-muted/20"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                  rec.type === "income" ? "bg-income-soft" : "bg-expense-soft"
                )}>
                  {rec.type === "income"
                    ? <ArrowUpRight className="w-4 h-4 text-income" />
                    : <ArrowDownRight className="w-4 h-4 text-expense" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{rec.name}</p>
                    {rec.active === "no" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Pausada</Badge>
                    )}
                    {rec.categoryName && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 hidden sm:flex"
                        style={{ background: `${rec.categoryColor}20`, color: rec.categoryColor ?? undefined }}
                      >
                        {rec.categoryName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Todo dia <span className="font-medium">{rec.dayOfMonth}</span> de cada mês
                    {rec.lastGeneratedMonth && (
                      <span className="ml-2 opacity-70">· Último: {rec.lastGeneratedMonth}</span>
                    )}
                  </p>
                </div>

                {/* Amount */}
                <p className={cn(
                  "text-sm font-semibold flex-shrink-0",
                  rec.type === "income" ? "text-income" : "text-expense"
                )}>
                  {rec.type === "income" ? "+" : "-"}{formatCurrency(rec.amount)}
                </p>

                {/* Toggle active */}
                <Switch
                  checked={rec.active === "yes"}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: rec.id, active: checked ? "yes" : "no" })
                  }
                  className="flex-shrink-0"
                />

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
                    <DropdownMenuItem onClick={() => { setEditingRec(rec); setModalOpen(true); }} className="gap-2 text-sm">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeletingId(rec.id)}
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

      {/* Info box */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex gap-3 items-start">
        <RefreshCw className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Como funciona:</span> As recorrências ativas são geradas automaticamente ao abrir o aplicativo. Você também pode clicar em <span className="font-medium text-foreground">"Gerar este mês"</span> para forçar a geração imediata. Cada lançamento é gerado apenas uma vez por mês.
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setEditingRec(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {editingRec ? "Editar Recorrência" : "Nova Recorrência"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <Tabs value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue("categoryId", undefined); }}>
                      <TabsList className="w-full h-10">
                        <TabsTrigger value="expense" className="flex-1 text-sm data-[state=active]:bg-expense data-[state=active]:text-white">
                          Despesa
                        </TabsTrigger>
                        <TabsTrigger value="income" className="flex-1 text-sm data-[state=active]:bg-income data-[state=active]:text-white">
                          Receita
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Aluguel, Salário, Netflix..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                        <Input {...field} placeholder="0,00" className="pl-9" inputMode="decimal" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Day of month */}
              <FormField
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia do mês</FormLabel>
                    <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecionar dia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-48">
                        {DAY_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            Dia {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                    <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecionar categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.length === 0 ? (
                          <div className="py-3 text-center text-sm text-muted-foreground">Nenhuma categoria disponível</div>
                        ) : (
                          filteredCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="min-w-24">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingRec ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              As transações já geradas por esta recorrência não serão excluídas. Apenas os lançamentos futuros serão interrompidos.
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
