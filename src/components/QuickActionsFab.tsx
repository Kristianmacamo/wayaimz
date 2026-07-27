import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Camera, Calculator, FileText, ListChecks, Sigma } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const ACTIONS = [
  {
    label: "Carregar Foto",
    desc: "Envie a foto do exercício para o AI resolver",
    icon: Camera,
    prompt: "Vou enviar a foto de um exercício. Explique e resolva passo a passo.",
  },
  {
    label: "Resolver Exercício",
    desc: "Resolução passo a passo",
    icon: ListChecks,
    prompt: "Resolva este exercício passo a passo, explicando cada etapa: ",
  },
  {
    label: "Criar Resumo",
    desc: "Resumo claro de uma matéria",
    icon: FileText,
    prompt: "Faça um resumo organizado e fácil de estudar sobre: ",
  },
  {
    label: "Gerar Introdução",
    desc: "Introdução para o seu trabalho",
    icon: Sigma,
    prompt: "Escreva uma introdução académica para um trabalho sobre: ",
  },
] as const;

export function QuickActionsFab() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function go(prompt: string) {
    setOpen(false);
    navigate({ to: "/chat", search: { start: prompt } as never });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Ações rápidas"
          className="fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-hero text-primary-foreground shadow-elegant transition hover:scale-105 md:bottom-6"
        >
          <Plus className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>Ações rápidas</SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid gap-2 pb-6 sm:grid-cols-2">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => go(a.prompt)}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-soft"
            >
              <a.icon className="mt-0.5 h-5 w-5 text-primary" />
              <span className="min-w-0">
                <span className="block font-medium">{a.label}</span>
                <span className="block text-xs text-muted-foreground">{a.desc}</span>
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              navigate({ to: "/formulas" });
            }}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-soft"
          >
            <Calculator className="mt-0.5 h-5 w-5 text-primary" />
            <span>
              <span className="block font-medium">Ver Fórmulas</span>
              <span className="block text-xs text-muted-foreground">Biblioteca de fórmulas explicadas</span>
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
