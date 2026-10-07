import { createFileRoute } from "@tanstack/react-router";

// O corpo não é confiável: só usamos o id e voltamos a consultar a PaySuite.
export const Route = createFileRoute("/api/public/epay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Record<string, any>;
          const id = body?.data?.id ?? body?.id ?? body?.data?.payment?.id;
          if (typeof id === "string" && id.length < 64) {
            const { syncByPaysuiteId } = await import("@/lib/epay.server");
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
