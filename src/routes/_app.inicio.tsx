import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryGrid } from "@/components/CategoryGrid";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calculator, BookOpen, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Way Estudantes AI" },
      { name: "description", content: "O seu painel de estudo: fórmulas, exercícios, trabalhos académicos e explicações com IA." },
      { property: "og:title", content: "Início — Way Estudantes AI" },
      { property: "og:description", content: "Painel do estudante com fórmulas, exercícios e trabalhos académicos." },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl p-5 md:p-10">
      <div className="rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-elegant md:p-8">
        <p className="text-sm opacity-90">Olá {profile?.nome ?? "Estudante"} 👋</p>
        <h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">Bem-vindo ao Way Estudantes AI</h1>
        <p className="mt-2 max-w-2xl text-sm text-primary-foreground/90">
          Aqui encontra explicações passo a passo, fórmulas matemáticas, ajuda para trabalhos académicos e ferramentas
          inteligentes para melhorar o seu desempenho escolar e universitário.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/chat"><MessageSquare className="mr-1 h-4 w-4" /> Perguntar à IA</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/formulas"><Calculator className="mr-1 h-4 w-4" /> Ver Fórmulas</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/trabalhos"><BookOpen className="mr-1 h-4 w-4" /> Criar Trabalho</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 rounded-xl border bg-card p-4">
        <Sparkles className="h-5 w-5 text-secondary" />
        <p className="text-sm">
          Créditos disponíveis: <strong>{profile?.credits ?? 0}</strong> · Plano:{" "}
          <span className="font-medium capitalize text-primary">{profile?.current_plan ?? "free"}</span>
        </p>
        <Link to="/planos" className="ml-auto text-sm font-medium text-primary hover:underline">Melhorar</Link>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-bold">Categorias</h2>
      <CategoryGrid />
    </div>
  );
}
