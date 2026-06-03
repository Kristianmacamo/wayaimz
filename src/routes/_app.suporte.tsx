import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Phone, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_app/suporte")({ component: SuportePage });

const FAQS = [
  { q: "Como ativo o meu plano?", a: "Vá a Planos, escolha um plano e em Pagamentos envie M-Pesa ou PayPal com a referência. O administrador aprova em até 24h." },
  { q: "As minhas conversas grátis acabaram, e agora?", a: "Cada utilizador novo tem 2 conversas grátis. Para continuar a usar, assine o plano Básico ou superior." },
  { q: "Como funciona o programa de afiliados?", a: "Partilha o seu código/link de afiliado. Por cada plano aprovado de quem se registou através do seu link, recebe 10% do valor." },
  { q: "Posso usar no telemóvel?", a: "Sim! A plataforma é 100% responsiva e funciona em qualquer telemóvel ou computador." },
  { q: "Como peço ajuda humana?", a: "Apenas planos Completo têm acesso a suporte humano. Use os contactos abaixo." },
];

function SuportePage() {
  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Suporte & Ajuda</h1>
      <p className="mt-1 text-muted-foreground">Estamos aqui para o ajudar a ter sucesso académico.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <MessageCircle className="mx-auto h-7 w-7 text-secondary" />
          <p className="mt-2 text-sm font-semibold">WhatsApp</p>
          <a href="https://wa.me/258840000000" className="text-xs text-primary hover:underline">+258 84 000 0000</a>
        </Card>
        <Card className="p-4 text-center">
          <Mail className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-2 text-sm font-semibold">Email</p>
          <a href="mailto:apoio@wayestudantes.co.mz" className="text-xs text-primary hover:underline">apoio@wayestudantes.co.mz</a>
        </Card>
        <Card className="p-4 text-center">
          <Phone className="mx-auto h-7 w-7 text-secondary" />
          <p className="mt-2 text-sm font-semibold">Telefone</p>
          <p className="text-xs text-muted-foreground">+258 84 000 0000</p>
        </Card>
      </div>

      <h2 className="mt-10 font-display text-xl font-bold flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" /> Perguntas frequentes</h2>
      <div className="mt-3 space-y-3">
        {FAQS.map((f) => (
          <Card key={f.q} className="p-5">
            <p className="font-semibold">{f.q}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-primary/30 bg-gradient-card p-5 text-center">
        <p className="text-sm">Não encontrou a sua resposta?</p>
        <a href="https://wa.me/258840000000" target="_blank" rel="noreferrer">
          <Button className="mt-3 bg-gradient-hero">Falar no WhatsApp</Button>
        </a>
      </Card>
    </div>
  );
}
