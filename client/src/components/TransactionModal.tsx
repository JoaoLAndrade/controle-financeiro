import { trpc } from "@/lib/trpc";
import { CATEGORY_ICONS } from "@/lib/format";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const schema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.string().min(1, "Informe o valor").regex(/^\d+([.,]\d{1,2})?$/, "Valor inválido"),
  date: z.date().refine((d) => !!d, { message: "Informe a data" }),
  description: z.string().min(1, "Informe a descrição").max(255),
  categoryId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  transaction?: {
    id: number;
    type: "income" | "expense" | "transfer";
    amount: string;
    date: Date;
    description: string;
    categoryId: number | null;
  };
}

export default function TransactionModal({
  open, onOpenChange, onSuccess, transaction
}: TransactionModalProps) {
  const isEdit = !!transaction;
  const { currency } = useCurrency();
  const currencySymbol = currency === "BRL" ? "R$" : "$";
  const amountPlaceholder = currency === "BRL" ? "0,00" : "0.00";
  const { data: categories } = trpc.categories.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      amount: "",
      date: new Date(),
      description: "",
      categoryId: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      if (transaction) {
        form.reset({
          type: transaction.type,
          amount: parseFloat(transaction.amount).toFixed(2),
          date: new Date(transaction.date),
          description: transaction.description,
          categoryId: transaction.categoryId?.toString() ?? undefined,
        });
      } else {
        form.reset({
          type: "expense",
          amount: "",
          date: new Date(),
          description: "",
          categoryId: undefined,
        });
      }
    }
  }, [open, transaction]);

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast.success("Transação criada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      toast.success("Transação atualizada!");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    // Normalize decimal separator: replace comma with dot (e.g. "1,50" → "1.50")
    const amount = values.amount.replace(",", ".");
    const categoryId = values.categoryId ? parseInt(values.categoryId) : null;

    if (isEdit && transaction) {
      updateMutation.mutate({
        id: transaction.id,
        type: values.type,
        amount,
        date: values.date,
        description: values.description,
        categoryId,
      });
    } else {
      createMutation.mutate({
        type: values.type,
        amount,
        date: values.date,
        description: values.description,
        categoryId,
      });
    }
  };

  const selectedType = form.watch("type");
  const filteredCategories = categories?.filter(
    (c) => c.type === selectedType || c.type === "both" || (selectedType === "transfer" && c.type === "transfer")
  ) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            {isEdit ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type toggle */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <Tabs
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue("categoryId", undefined);
                    }}
                  >
                    <TabsList className="w-full h-10">
                      <TabsTrigger value="expense" className="flex-1 text-sm data-[state=active]:bg-expense data-[state=active]:text-white">
                        Despesa
                      </TabsTrigger>
                      <TabsTrigger value="income" className="flex-1 text-sm data-[state=active]:bg-income data-[state=active]:text-white">
                        Receita
                      </TabsTrigger>
                      <TabsTrigger value="transfer" className="flex-1 text-sm data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                        Transferência
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor ({currencySymbol})</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">{currencySymbol}</span>
                      <Input
                        {...field}
                        placeholder={amountPlaceholder}
                        className="pl-9"
                        inputMode="decimal"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Supermercado, Salário..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value
                            ? format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            : "Selecionar data"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                        <div className="py-3 text-center text-sm text-muted-foreground">
                          Nenhuma categoria disponível
                        </div>
                      ) : (
                        filteredCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ background: cat.color }}
                              />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-24">
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isEdit ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
