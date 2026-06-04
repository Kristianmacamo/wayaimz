import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";

const SYSTEM = `És o Way Estudantes AI, um assistente académico para estudantes moçambicanos do ensino secundário e superior. Respondes em português de Moçambique, de forma clara, educativa e didática. Ajudas com trabalhos para casa, exercícios, pesquisas, resumos, explicações de matérias, testes, exames e trabalhos académicos. Quando resolves um exercício, mostras os passos. Usas Markdown.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = authHeader.slice(7);

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: cerr } = await supabase.auth.getClaims(token);
        if (cerr || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claims.claims.sub as string;

        // Check profile & plan
        const { data: profile } = await supabase.from("profiles").select("current_plan, plan_expires_at, free_chats_used, suspended").eq("id", userId).maybeSingle();
        if (!profile) return new Response("Profile not found", { status: 404 });
        if (profile.suspended) return new Response("Account suspended", { status: 403 });

        const planActive = profile.current_plan !== "free" && (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date());
        if (!planActive && profile.free_chats_used >= 2) {
          return new Response(JSON.stringify({ error: "limit", message: "Atingiu o limite de 2 conversas grátis. Adquira um plano para continuar." }), { status: 402, headers: { "content-type": "application/json" } });
        }

        const { messages } = (await request.json()) as { messages: UIMessage[] };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
          onFinish: async ({ text }) => {
            try {
              // ensure conversation exists
              let { data: conv } = await supabase.from("conversations").select("id").eq("user_id", userId).maybeSingle();
              if (!conv) {
                const { data: created } = await supabase.from("conversations").insert({ user_id: userId }).select("id").single();
                conv = created;
              }
              if (!conv) return;
              const lastUser = [...messages].reverse().find((m) => m.role === "user");
              const userText = lastUser ? lastUser.parts.map((p) => (p.type === "text" ? p.text : "")).join("") : "";
              await supabase.from("messages").insert([
                { conversation_id: conv.id, user_id: userId, role: "user", content: userText },
                { conversation_id: conv.id, user_id: userId, role: "assistant", content: text },
              ]);
              if (!planActive) {
                await supabase.from("profiles").update({ free_chats_used: profile.free_chats_used + 1 }).eq("id", userId);
              }
            } catch (e) { console.error("persist error", e); }
          },
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
