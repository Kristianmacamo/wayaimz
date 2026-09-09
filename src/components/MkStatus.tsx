import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

const MAP: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
  pendente: { label: "Pendente", className: "bg-amber-100 text-amber-800 border-amber-200", Icon: Clock },
  a_processar: { label: "A processar", className: "bg-sky-100 text-sky-800 border-sky-200", Icon: Loader2 },
  confirmado: { label: "Pago", className: "bg-emerald-100 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  falhado: { label: "Falhado", className: "bg-red-100 text-red-800 border-red-200", Icon: XCircle },
  aprovado: { label: "Aprovado", className: "bg-emerald-100 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  rejeitado: { label: "Rejeitado", className: "bg-red-100 text-red-800 border-red-200", Icon: XCircle },
};

export function MkStatus({ status }: { status: string }) {
  const s = MAP[status] ?? MAP["pendente"]!;
  return (
    <Badge variant="outline" className={`gap-1 ${s.className}`}>
      <s.Icon className={`h-3 w-3 ${status === "a_processar" ? "animate-spin" : ""}`} />
      {s.label}
    </Badge>
  );
}
