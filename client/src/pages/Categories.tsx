import { trpc } from "@/lib/trpc";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, Pencil, Plus, Tag, Trash2,
  TrendingDown, TrendingUp, ArrowLeftRight
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import * as LucideIcons from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Informe o nome").max(100),
  color: z.string().min(1, "Selecione uma cor"),
  icon: z.string().min(1, "Selecione um ícone"),
  type: z.enum(["income", "expense", "both"]),
});

type FormValues = z.infer<typeof schema>;

const TYPE_LABELS = {
  income: "Receita",
  expense: "Despesa",
  both: "Ambos",
};

function CategoryIcon({ icon, color, size = 16 }: { icon: string; color: string; size?: number }) {
  const iconName = icon
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("") as keyof typeof LucideIcons;
  const IconComponent = (LucideIcons[iconName] as React.ElementType) ?? LucideIcons.Tag;
  return <IconComponent style={{ color, width: size, height: size }} />;
}

export default function Categories() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: categories, isLoading, refetch } = trpc.categories.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", color: "#6366f1", icon: "tag", type: "both" },
  });

  useEffect(() => {
    if (modalOpen) {
      if (editingCat) {
        form.reset({
          name: editingCat.name,
          color: editingCat.color,
          icon: editingCat.icon,
          type: editingCat.type,
        });
      } else {
        form.reset({ name: "", color: "#6366f1", icon: "tag", type: "both" });
      }
    }
  }, [modalOpen, editingCat]);

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: () => { toast.success("Categoria criada!"); setModalOpen(false); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateMutation = trpc.categories.update.useMutation({
    onSuccess: () => { toast.success("Categoria atualizada!"); setModalOpen(false); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => { toast.success("Categoria excluída."); setDeletingId(null); refetch(); },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    if (editingCat) {
      updateMutation.mutate({ id: editingCat.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  const selectedColor = form.watch("color");

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize suas transações com categorias personalizadas
          </p>
        </div>
        <Button onClick={() => { setEditingCat(null); setModalOpen(true); }} className="gap-2 h-9">
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Categories grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !categories?.length ? (
        <Card className="card-shadow border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Tag className="w-5 h-5 opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm text-foreground">Nenhuma categoria ainda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crie categorias para organizar suas transações.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditingCat(null); setModalOpen(true); }}
              className="gap-2 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar primeira categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="card-shadow border-border/60 hover:card-shadow-hover transition-shadow duration-300 group"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${cat.color}20` }}
                >
                  <CategoryIcon icon={cat.icon} color={cat.color} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{cat.name}</p>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4 mt-0.5"
                    style={{ background: `${cat.color}15`, color: cat.color }}
                  >
                    {TYPE_LABELS[cat.type]}
                  </Badge>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity sm:opacity-0 opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-foreground"
                    onClick={() => { setEditingCat(cat); setModalOpen(true); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingId(cat.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) setEditingCat(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {editingCat ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Alimentação, Salário..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <ArrowLeftRight className="w-3.5 h-3.5" /> Ambos
                          </div>
                        </SelectItem>
                        <SelectItem value="income">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-income" /> Receita
                          </div>
                        </SelectItem>
                        <SelectItem value="expense">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-3.5 h-3.5 text-expense" /> Despesa
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color */}
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "w-7 h-7 rounded-full transition-all duration-150",
                            field.value === color
                              ? "ring-2 ring-offset-2 ring-foreground scale-110"
                              : "hover:scale-110"
                          )}
                          style={{ background: color }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Icon */}
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_ICONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          title={label}
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150",
                            field.value === value
                              ? "ring-2 ring-offset-1 scale-105"
                              : "bg-muted hover:bg-accent"
                          )}
                          style={field.value === value ? { background: `${selectedColor}20` } : {}}
                          onClick={() => field.onChange(value)}
                        >
                          <CategoryIcon
                            icon={value}
                            color={field.value === value ? selectedColor : "var(--muted-foreground)"}
                            size={16}
                          />
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="min-w-24">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCat ? "Salvar" : "Criar"}
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
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              As transações vinculadas a esta categoria não serão excluídas, mas perderão a associação.
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
