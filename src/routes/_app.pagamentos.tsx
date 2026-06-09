import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { notifyAdminPayment } from "@/lib/notify.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pagamentos")({
  component: PagamentosPage,
  validateSearch: (s: Record<string, unknown>) => ({
    plan: (typeof s.plan === "string" ? s.plan : "premium") as PlanId,
  }),
});

const WHATSAPP_NUMBER = "258844772002";

function PagamentosPage() {
  const { plan } = Route.useSearch();
  const qc = useQueryClient();
  const selected = PLANS[plan as PlanId] ?? PLANS.premium;

  const { data: payments } = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () =>
      (await supabase.from("payments").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Pagamento via M-Pesa</h1>
      <p className="mt-1 text-muted-foreground">
        Pagamento manual e seguro. Após confirmação (até 24h), o seu plano é activado automaticamente.
      </p>

      <Card className="mt-6 border-primary/30 bg-gradient-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Plano selecionado</p>
            <p className="font-display text-xl font-bold">{selected.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{selected.price} MT</p>
            {selected.period && <p className="text-xs text-muted-foreground">{selected.period}</p>}
          </div>
        </div>
        <Link to="/planos" className="mt-3 inline-block text-sm text-primary hover:underline">
          Alterar plano
        </Link>
      </Card>

      <div className="mt-6">
        <MpesaForm planId={selected.id} amount={selected.price} onSent={() => qc.invalidateQueries({ queryKey: ["my-payments"] })} />
      </div>

      <h2 className="mt-10 font-display text-xl font-bold">Meus pagamentos</h2>
      <div className="mt-3 space-y-2">
        {(!payments || payments.length === 0) && (
          <p className="text-sm text-muted-foreground">Ainda não submeteu nenhum pagamento.</p>
        )}
        {payments?.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium capitalize">
                {p.plan} — {p.amount_mt} MT
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString("pt-PT")} · {p.method.toUpperCase()} · Ref: {p.reference}
              </p>
            </div>
            <Badge
              variant={p.status === "aprovado" ? "default" : p.status === "rejeitado" ? "destructive" : "secondary"}
            >
              {p.status === "aprovado" && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {p.status}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MpesaForm({ planId, amount, onSent }: { planId: PlanId; amount: number; onSent: () => void }) {
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const notify = useServerFn(notifyAdminPayment);

  async function submit() {
    if (planId === "free") return;
    if (!code && !file) {
      toast.error("Indique o código da transação ou anexe o comprovativo.");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      let proofUrl: string | null = null;
      if (file) {
        const path = `${u.user.id}/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from("mpesa-proofs").upload(path, file);
        if (up.error) throw up.error;
        proofUrl = supabase.storage.from("mpesa-proofs").getPublicUrl(path).data.publicUrl;
      }
      const { data: inserted, error } = await supabase
        .from("payments")
        .insert({
          user_id: u.user.id,
          plan: planId,
          amount_mt: amount,
          method: "mpesa",
          reference: code || "comprovativo",
          transaction_code: code || null,
          proof_url: proofUrl,
          status: "pendente",
        } as never)
        .select()
        .single();
      if (error) throw error;

      // Notificar admin por email (não bloqueia)
      try {
        await notify({
          data: {
            paymentId: (inserted as { id: string }).id,
            plan: planId,
            amount,
            transactionCode: code || null,
            proofUrl,
            userEmail: u.user.email ?? "",
          },
        });
      } catch (e) {
        console.warn("Notify admin failed", e);
      }

      toast.success("Pedido enviado! Aguarde aprovação (até 24h).");
      setCode("");
      setFile(null);
      onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  }

  const message = encodeURIComponent(
    `Já efetuei o pagamento via M-Pesa de ${amount} MT (Plano ${planId}). Segue em anexo o comprovativo ou o código da transação${code ? `: ${code}` : ""}. Peço a aprovação do meu pacote.`
  );

  return (
    <Card className="p-5 space-y-4">
      <div>
        <p className="font-medium">Como pagar</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Envie <strong>{amount} MT</strong> via M-Pesa para <strong>+258 84 477 2002</strong> (Way Estudantes).</li>
          <li>Cole abaixo o código da transação <em>ou</em> anexe a foto do comprovativo.</li>
          <li>Clique em <strong>Solicitar aprovação</strong>. Será notificado quando os créditos forem activados.</li>
        </ol>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Código da transação M-Pesa</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ex: CGT4K2L9P0"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Ou anexe foto do comprovativo</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={submit} disabled={busy || planId === "free"} className="flex-1 bg-gradient-hero">
          {busy ? "A enviar..." : "Solicitar aprovação"}
        </Button>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1"
        >
          <Button variant="outline" className="w-full">
            <Smartphone className="mr-2 h-4 w-4" /> Falar no WhatsApp
          </Button>
        </a>
      </div>

      <p className="text-xs text-muted-foreground">
        O administrador é notificado por email assim que submeter o pedido.
      </p>
    </Card>
  );
}
