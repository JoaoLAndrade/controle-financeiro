import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { PiggyBank, TrendingUp, Shield, BarChart3 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-foreground/10 flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-primary-foreground text-lg">
            Finanças Pessoal
          </span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="font-display text-4xl font-semibold text-primary-foreground leading-tight mb-4">
              Controle total das suas finanças
            </h1>
            <p className="text-primary-foreground/70 text-lg leading-relaxed">
              Acompanhe receitas, despesas e evolua seu patrimônio com clareza e elegância.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: TrendingUp, text: "Acompanhe sua evolução financeira mês a mês" },
              { icon: BarChart3, text: "Relatórios detalhados por categoria" },
              { icon: Shield, text: "Seus dados são privados e seguros" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-primary-foreground/80 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-foreground/40 text-xs">
          © {new Date().getFullYear()} Finanças Pessoal. Todos os direitos reservados.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg">Finanças Pessoal</span>
          </div>

          <div>
            <h2 className="font-display text-3xl font-semibold text-foreground mb-2">
              Bem-vindo
            </h2>
            <p className="text-muted-foreground">
              Faça login para acessar seu painel financeiro.
            </p>
          </div>

          <Button
            className="w-full h-11 text-sm font-medium"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            Entrar com Manus
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Ao entrar, você concorda com os termos de uso e política de privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}
