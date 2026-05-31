import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  Sun,
  Tag,
  Target,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useCurrency } from "@/contexts/CurrencyContext";

const navItems = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/recorrencias", label: "Recorrências", icon: CalendarClock },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/categorias", label: "Categorias", icon: Tag },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const hasGeneratedRef = useRef(false);
  const utils = trpc.useUtils();

  // Auto-generate recurring transactions for current month once per session
  const generateMutation = trpc.recurring.generateForMonth.useMutation({
    onSuccess: (count) => {
      if (count > 0) {
        utils.reports.summary.invalidate();
        utils.reports.totalBalance.invalidate();
        utils.reports.monthlyEvolution.invalidate();
        utils.reports.categoryBreakdown.invalidate();
        utils.transactions.list.invalidate();
        utils.goals.list.invalidate();
      }
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      navigate("/login");
    },
    onError: () => toast.error("Erro ao sair. Tente novamente."),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
    if (!loading && isAuthenticated && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      const now = new Date();
      generateMutation.mutate({ year: now.getFullYear(), month: now.getMonth() + 1 });
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <PiggyBank className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-card border-r border-border",
          "transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <PiggyBank className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-foreground text-sm leading-tight">
              Finanças
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Pessoal
            </p>
          </div>
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                  "transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Currency toggle */}
        <div className="px-3 pb-1">
          <button
            onClick={() => setCurrency(currency === "BRL" ? "USD" : "BRL")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              "transition-all duration-200"
            )}
            title={currency === "BRL" ? "Mudar para Dólar (USD)" : "Mudar para Real (BRL)"}
          >
            <span className="w-4 h-4 flex-shrink-0 text-base leading-none flex items-center justify-center font-bold">
              {currency === "BRL" ? "R$" : "$"}
            </span>
            <span>{currency === "BRL" ? "Real (BRL)" : "Dólar (USD)"}</span>
            {/* Toggle pill */}
            <div className={cn(
              "ml-auto w-9 h-5 rounded-full transition-colors duration-300 flex items-center px-0.5",
              currency === "USD" ? "bg-primary" : "bg-muted"
            )}>
              <div className={cn(
                "w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                currency === "USD" ? "translate-x-4" : "translate-x-0"
              )} />
            </div>
          </button>
        </div>

        {/* Theme toggle */}
        <div className="px-3 pb-2">
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
              "text-muted-foreground hover:text-foreground hover:bg-accent",
              "transition-all duration-200"
            )}
            title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{theme === "dark" ? "Tema Claro" : "Tema Escuro"}</span>
            {/* Toggle pill */}
            <div className={cn(
              "ml-auto w-9 h-5 rounded-full transition-colors duration-300 flex items-center px-0.5",
              theme === "dark" ? "bg-primary" : "bg-muted"
            )}>
              <div className={cn(
                "w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                theme === "dark" ? "translate-x-4" : "translate-x-0"
              )} />
            </div>
          </button>
        </div>

        {/* User profile */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name ?? "Usuário"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ?? ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
              onClick={() => logoutMutation.mutate()}
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <PiggyBank className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold text-sm">Finanças Pessoal</span>
          </div>
          <button
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
