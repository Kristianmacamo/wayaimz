import { createFileRoute, Link } from "@tanstack/react-router";
import { PLANS, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/planos")({ component: PlanosPage });

function PlanosPage() {
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => (await supabase.from("profiles").select("current_plan, plan_expires_at").maybeSingle()).data,
  });
  const current = (profile?.current_plan ?? "free") as PlanId;

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Planos & Preços</h1>
        <p className="mt-2 text-muted-foreground">Escolha o plano ideal para o seu sucesso académico.</p>
        {profile?.plan_expires_at && current !== "free" && (
          <p className="mt-2 text-sm text-secondary">Plano atual expira em {new Date(profile.plan_expires_at).toLocaleDateString("pt-PT")}</p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {(Object.values(PLANS)).map((p) => {
          const isCurrent = p.id === current;
          const highlight = p.id === "mensal_premium";
          return (
            <Card key={p.id} className={`relative flex flex-col p-6 ${highlight ? "border-primary shadow-elegant ring-2 ring-primary/20" : ""}`}>
              {highlight && (
                <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-hero px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Crown className="h-3 w-3" /> Mais Popular
                </div>
              )}
              <h3 className="font-display text-xl font-bold">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">MT{p.period && ` / ${p.period}`}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /><span>{f}</span></li>
                ))}
                {p.notIncluded.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-muted-foreground line-through"><X className="mt-0.5 h-4 w-4 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
              {isCurrent ? (
                <Button disabled className="mt-6 w-full">Plano Atual</Button>
              ) : p.id === "free" ? (
                <Button variant="outline" disabled className="mt-6 w-full">Gratuito</Button>
              ) : (
                <Link to="/pagamentos" search={{ plan: p.id }} className="mt-6">
                  <Button className={`w-full ${highlight ? "bg-gradient-hero" : ""}`}>Assinar</Button>
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
