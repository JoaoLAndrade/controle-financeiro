import { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Currency = "BRL" | "USD";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatMoney: (value: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "BRL",
  setCurrency: () => {},
  formatMoney: (v) => String(v),
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = trpc.auth.me.useQuery();
  const [currency, setCurrencyState] = useState<Currency>("BRL");

  // Sync with user preference from server
  useEffect(() => {
    if (user && (user as { currency?: Currency }).currency) {
      setCurrencyState((user as { currency: Currency }).currency);
    }
  }, [user]);

  const updateCurrency = trpc.auth.updateCurrency.useMutation();
  const utils = trpc.useUtils();

  const setCurrency = (c: Currency) => {
    const previous = currency;
    setCurrencyState(c);
    updateCurrency.mutate(
      { currency: c },
      {
        onSuccess: () => {
          utils.auth.me.invalidate();
        },
        onError: () => {
          // Rollback to previous value if save fails
          setCurrencyState(previous);
          toast.error("Erro ao salvar preferência de moeda.");
        },
      }
    );
  };

  const formatMoney = (value: number | string): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return currency === "BRL" ? "R$ 0,00" : "$ 0.00";
    if (currency === "BRL") {
      return num.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return num.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatMoney }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
