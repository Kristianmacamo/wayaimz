import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function safeEq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Verifica o aviso de pagamento (X-EducavelPay-Signature) ou o webhook da loja (X-Epay-Signature). */
function verify(raw: string, headers: Headers) {
  const simple = headers.get("x-educavelpay-signature");
  const key = process.env["EPAY_SECRET_KEY"];
  if (simple && key) {
    return safeEq(createHmac("sha256", key).update(raw).digest("hex"), simple.trim());
  }
  const store = headers.get("x-epay-signature");
  const whSecret = process.env["EPAY_WEBHOOK_SECRET"];
  if (store && whSecret) {
    const parts = Object.fromEntries(store.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
    const t = Number(parts["t"]);
    if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
    const expected = createHmac("sha256", whSecret).update(`${parts["t"]}.${raw}`).digest("hex");
    return safeEq(expected, parts["v1"] ?? "");
  }
  return false;
}

export const Route = createFileRoute("/api/public/epay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!verify(raw, request.headers)) return new Response("Invalid signature", { status: 401 });
        try {
          const body = JSON.parse(raw) as Record<string, any>;
          // Aviso do pagamento: { id, ... }; webhook da loja: { id: evt_..., data: { id } }
          const id = body?.data?.id ?? body?.id;
          if (typeof id === "string" && id.length < 64) {
            const { syncByPaysuiteId } = await import("@/lib/epay.server");
            // Mesmo com assinatura válida, o estado é confirmado consultando a ePay.
            await syncByPaysuiteId(id);
          }
        } catch (e) {
          console.error("[epay webhook]", e);
        }
        return new Response("ok");
      },
    },
  },
});
