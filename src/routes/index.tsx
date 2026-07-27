import { Link } from "@tanstack/react-router";
import { GraduationCap, ArrowRight, Sparkles, BookOpen, FileText, Beaker, ClipboardCheck, Users, Award, ShieldCheck, Zap } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { CategoryGrid } from "@/components/CategoryGrid";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Way Estudantes AI – Aprenda Melhor com Inteligência Artificial" },
      { name: "description", content: "A plataforma académica inteligente para estudantes moçambicanos. Receba ajuda em trabalhos, exercícios, pesquisas, testes e exames através da IA." },
      { property: "og:title", content: "Way Estudantes AI" },
      { property: "og:description", content: "Aprenda melhor com IA. Trabalhos, exercícios, testes e exames para estudantes de Moçambique." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-bold">Way Estudantes <span className="text-gradient">AI</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
            <Button asChild size="sm" className="bg-gradient-hero"><Link to="/auth" search={{ mode: "signup" } as never}>Criar conta</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-accent opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              Para estudantes do Secundário e Superior em Moçambique
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Aprenda melhor com <span className="text-gradient">Inteligência Artificial</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              A plataforma académica que ajuda em trabalhos para casa, exercícios, pesquisas, testes e exames — 24 horas por dia.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gradient-hero shadow-elegant">
                <Link to="/auth" search={{ mode: "signup" } as never}>
                  Criar conta grátis <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Entrar</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">2 conversas grátis para experimentar — sem cartão.</p>
          </div>

          {/* welcome */}
          <div className="mx-auto mt-14 max-w-3xl rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-display text-2xl font-bold">Bem-vindo ao Way Estudantes AI</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              O Way Estudantes AI é uma plataforma criada para ajudar estudantes de Moçambique a aprender de forma mais
              simples, organizada e moderna. Aqui o estudante encontra explicações passo a passo, fórmulas matemáticas,
              ajuda para trabalhos académicos e ferramentas inteligentes para melhorar o desempenho escolar e universitário.
            </p>
          </div>

          <h2 className="mb-4 mt-12 text-center font-display text-2xl font-bold">Categorias</h2>
          <CategoryGrid authed={false} />

          {/* features grid */}
          <div className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: BookOpen, label: "Trabalhos para casa" },
              { icon: FileText, label: "Pesquisas e Resumos" },
              { icon: Beaker, label: "Exercícios resolvidos" },
              { icon: ClipboardCheck, label: "Testes e Exames" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border bg-card p-4 shadow-soft transition-all hover:shadow-elegant hover:-translate-y-0.5">
                <f.icon className="h-6 w-6 text-primary" />
                <p className="mt-2 text-sm font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="border-t bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Planos acessíveis</h2>
            <p className="mt-2 text-muted-foreground">Escolha o plano que melhor se adequa ao seu estudo.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {(["free", "basico", "premium"] as const).map((id) => {
              const p = PLANS[id];
              const featured = id === "premium";
              return (
                <div key={id} className={`relative rounded-2xl border bg-card p-6 ${featured ? "shadow-elegant ring-2 ring-primary" : "shadow-soft"}`}>
                  {featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-hero px-3 py-1 text-xs font-semibold text-primary-foreground">Mais popular</span>}
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  <div className="mt-3"><span className="text-3xl font-extrabold">{p.price} MT</span><span className="text-muted-foreground"> / {p.period}</span></div>
                  <ul className="mt-5 space-y-2 text-sm">
                    {p.features.map((f: string) => <li key={f} className="flex gap-2"><ShieldCheck className="h-4 w-4 text-success" /> {f}</li>)}
                  </ul>
                  <Button asChild className={`mt-6 w-full ${featured ? "bg-gradient-hero" : ""}`} variant={featured ? "default" : "outline"}>
                    <Link to="/auth" search={{ mode: "signup" } as never}>Começar</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Affiliate */}
      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-soft px-3 py-1 text-xs font-semibold text-secondary">
              <Users className="h-3.5 w-3.5" /> Programa de Afiliados
            </div>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Ganhe dinheiro indicando colegas</h2>
            <p className="mt-3 text-muted-foreground">Receba <strong>10% de comissão</strong> sobre cada pagamento dos seus indicados. Sem limites.</p>
          </div>
          <div className="rounded-2xl border bg-gradient-card p-6 shadow-elegant">
            <div className="space-y-3">
              {[
                { plan: "Plano 65 MT", comm: "6,50 MT" },
                { plan: "Plano 180 MT", comm: "18 MT" },
                { plan: "Plano 300 MT", comm: "30 MT" },
              ].map((r) => (
                <div key={r.plan} className="flex items-center justify-between rounded-lg bg-card/70 px-4 py-3">
                  <span className="text-sm font-medium">{r.plan}</span>
                  <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">+{r.comm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-gradient-hero py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Award className="mx-auto h-10 w-10" />
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Pronto para um estudo mais inteligente?</h2>
          <p className="mt-2 text-primary-foreground/85">Junte-se a estudantes moçambicanos que já estudam com IA.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Zap className="mr-1 h-4 w-4" /> Criar conta agora
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Way Estudantes AI — Moçambique
      </footer>
    </div>
  );
}
