export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "R$\u00a00,00";
  let num: number;
  if (typeof value === "string") {
    // If string contains a comma, treat as pt-BR format: "1.500,50" → 1500.50
    // If string uses only dot as decimal (DB format): "1500.50" → 1500.50
    const hasBrFormat = value.includes(",");
    const normalized = hasBrFormat
      ? value.replace(/\./g, "").replace(",", ".")
      : value;
    num = parseFloat(normalized);
  } else {
    num = value;
  }
  if (isNaN(num)) return "R$\u00a00,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatMonthYear(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

export function formatShortMonth(dateStr: string): string {
  // dateStr format: "YYYY-MM"
  const [year, month] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(d);
}

export function getCurrentMonthYear() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const CATEGORY_ICONS = [
  { value: "tag", label: "Etiqueta" },
  { value: "home", label: "Casa" },
  { value: "car", label: "Carro" },
  { value: "utensils", label: "Alimentação" },
  { value: "heart-pulse", label: "Saúde" },
  { value: "graduation-cap", label: "Educação" },
  { value: "shirt", label: "Vestuário" },
  { value: "plane", label: "Viagem" },
  { value: "shopping-cart", label: "Compras" },
  { value: "briefcase", label: "Trabalho" },
  { value: "piggy-bank", label: "Poupança" },
  { value: "trending-up", label: "Investimento" },
  { value: "zap", label: "Energia" },
  { value: "wifi", label: "Internet" },
  { value: "smartphone", label: "Telefone" },
  { value: "music", label: "Entretenimento" },
  { value: "dumbbell", label: "Academia" },
  { value: "gift", label: "Presente" },
];

export const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#a855f7", "#84cc16",
];
