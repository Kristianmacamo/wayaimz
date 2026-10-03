import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calculator, ShoppingBag, BookOpen, User } from "lucide-react";

const TABS = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/formulas", label: "Fórmulas", icon: Calculator },
  { to: "/loja", label: "Loja", icon: ShoppingBag },
  { to: "/trabalhos", label: "Trabalhos", icon: BookOpen },
  { to: "/perfil", label: "Conta", icon: User },
] as const;

export function AppTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden">
      {TABS.map((t) => {
        const active = pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`flex flex-col items-center gap-1 py-2 text-[11px] ${active ? "text-primary font-semibold" : "text-muted-foreground"}`}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
