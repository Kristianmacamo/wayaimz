import { createFileRoute } from "@tanstack/react-router";

// O corpo não é confiável: só usamos o id e voltamos a consultar a PaySuite.
export const Route = createFileRoute("/api/public/paysuite-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Record<string, any>;
          const id = body?.data?.id ?? body?.id ?? body?.data?.payment?.id;
          if (typeof id === "string" && id.length < 64) {
            const { syncByPaysuiteId } = await import("@/lib/paysuite.server");
            await syncByPaysuiteId(id);
          }
        } catch (e) {
          console.error("[paysuite webhook]", e);
        }
        return new Response("ok");
      },
    },
  },
});
