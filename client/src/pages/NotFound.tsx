import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, PiggyBank } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Error code */}
        <p className="text-7xl font-bold text-primary/20 font-display leading-none mb-2 select-none">
          404
        </p>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Página não encontrada
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          A página que você está procurando não existe ou foi movida.
          Verifique o endereço ou volte ao início.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => setLocation("/")}>
            <Home className="w-4 h-4 mr-2" />
            Ir para o Dashboard
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
