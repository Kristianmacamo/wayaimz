import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, MessageSquare, BookOpen, Beaker, ClipboardCheck, FileText, CreditCard, Users, User as UserIcon, LifeBuoy, LogOut, Menu, X, Shield, Wallet, Home, Calculator, Sigma, Lightbulb, Settings } from "lucide-react";
import { AppTabBar } from "@/components/AppTabBar";

import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

const NAV = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/chat", label: "Chat AI", icon: MessageSquare },
  { to: "/matematica", label: "Matemática", icon: Sigma },
  { to: "/formulas", label: "Fórmulas", icon: Calculator },
  { to: "/trabalhos", label: "Trabalhos Académicos", icon: BookOpen },
  { to: "/explicacoes", label: "Explicações", icon: Lightbulb },
  { to: "/exercicios", label: "Exercícios Práticos", icon: Beaker },
  { to: "/planos", label: "Planos", icon: CreditCard },
  { to: "/perfil", label: "Perfil do Estudante", icon: UserIcon },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const NAV_SECONDARY = [
  { to: "/testes", label: "Testes", icon: ClipboardCheck },
  { to: "/exames", label: "Exames", icon: FileText },
  { to: "/pagamentos", label: "Pagamentos", icon: Wallet },
  { to: "/afiliados", label: "Afiliados", icon: Users },
  { to: "/suporte", label: "Suporte", icon: LifeBuoy },
] as const;

function AppLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });

  useEffect(() => { setOpen(false); }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-sidebar transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/inicio" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display font-bold">Way <span className="text-gradient">AI</span></span>
          </Link>
          <button className="md:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>

        {profile && (
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-hero text-xl text-primary-foreground">
                {profile.emoji ?? "🎓"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profile.nome} {profile.apelido}</p>
                <p className="text-xs capitalize text-muted-foreground">Plano: <span className="font-medium text-primary">{profile.current_plan}</span></p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "hover:bg-sidebar-accent/60"}`}>
                <item.icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
          <p className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mais</p>
          {NAV_SECONDARY.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "hover:bg-sidebar-accent/60"}`}>
                <item.icon className="h-4 w-4" />{item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link to="/admin" className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${pathname.startsWith("/admin") ? "bg-secondary-soft text-secondary font-semibold" : "hover:bg-sidebar-accent/60"}`}>
              <Shield className="h-4 w-4" /> Administração
            </Link>
          )}
        </nav>

        <div className="border-t p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <button onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="font-display font-bold">Way Estudantes <span className="text-gradient">AI</span></span>
        </header>
        <main className="flex-1 pb-16 md:pb-0"><Outlet /></main>
      </div>

      <AppTabBar />
      
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
