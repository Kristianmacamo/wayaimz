import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { planAllows, type PlanId } from "@/lib/plans";

type Props = {
  title: string;
  subtitle: string;
  feature: "exercicios" | "testes" | "exames" | "chat";
  prompts: { label: string; prompt: string }[];
  icon: React.ReactNode;
};

export function SubjectHub({ title, subtitle, feature, prompts, icon }: Props) {
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("current_plan, plan_expires_at").maybeSingle();
      return data;
    },
  });

  const plan = (profile?.current_plan as PlanId) ?? "free";
  const expired = profile?.plan_expires_at && new Date(profile.plan_expires_at) < new Date();
  const effective: PlanId = expired ? "free" : plan;
  const allowed = planAllows(effective, feature);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <div className="mb-8 flex items-start gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-hero text-primary-foreground shadow-soft">
          {icon}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {!allowed && (
        <Card className="mb-6 border-secondary/30 bg-secondary-soft p-5">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-secondary" />
            <div className="flex-1">
              <p className="font-semibold">Recurso bloqueado no seu plano ({effective})</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Faça upgrade para desbloquear este módulo e aproveitar todo o potencial do Way AI.
              </p>
              <Link to="/planos"><Button size="sm" className="mt-3 bg-gradient-hero">Ver Planos</Button></Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {prompts.map((p) => (
          <Link
            key={p.label}
            to="/chat"
            search={{ start: p.prompt }}
            className={`group rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-soft ${!allowed ? "pointer-events-none opacity-50" : ""}`}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{p.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.prompt}</p>
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-gradient-card p-5">
        <p className="text-sm text-muted-foreground">
          Pode também ir diretamente para o <Link to="/chat" className="font-medium text-primary hover:underline">Chat AI</Link> e escrever a sua própria pergunta.
        </p>
      </div>
    </div>
  );
}
