import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, Loader2, Search, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/chat")({
  component: ChatPage,
  validateSearch: (s: Record<string, unknown>) => ({ start: typeof s.start === "string" ? s.start : undefined }),
});

function ChatPage() {
  const { start } = Route.useSearch();
  const [input, setInput] = useState(start ?? "");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: history } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data: conv } = await supabase.from("conversations").select("id").maybeSingle();
      if (!conv) return [];
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at");
      return data ?? [];
    },
  });

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat",
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        const t = data.session?.access_token;
        return t ? { Authorization: `Bearer ${t}` } : {};
      },
    })
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: transportRef.current,
    onError: (e) => toast.error(e.message || "Erro na conversa"),
  });

  useEffect(() => {
    if (history && history.length > 0 && messages.length === 0) {
      setMessages(history.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      })));
    }
  }, [history, messages.length, setMessages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);

  const loading = status === "submitted" || status === "streaming";

  async function onSend() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    try {
      await sendMessage({ text });
    } catch (e) {
      console.error(e);
    }
  }

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-screen">
      <div className="flex items-center gap-2 border-b bg-card px-4 py-3">
        <Sparkles className="h-4 w-4 text-secondary" />
        <h1 className="font-display font-semibold flex-1">Chat AI Académico</h1>
        <Button variant="ghost" size="sm" onClick={() => setSearchOpen((v) => !v)} aria-label="Buscar no histórico">
          {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {searchOpen && (
        <div className="border-b bg-card px-4 py-2">
          <input
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Procurar nas conversas anteriores..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          {searchTerm && (
            <p className="mt-1 text-xs text-muted-foreground">
              {messages.filter((m) => m.parts.some((p) => p.type === "text" && p.text.toLowerCase().includes(searchTerm.toLowerCase()))).length} resultado(s)
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {messages.length === 0 && (
            <div className="rounded-2xl border bg-gradient-card p-6 text-center shadow-soft">
              <h2 className="font-display text-lg font-bold">Olá! Sou o seu assistente académico 🎓</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pergunte sobre matemática, ciências, português, história — ou peça ajuda com um trabalho.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  "Explica-me a fotossíntese",
                  "Resolve: 2x² − 5x + 3 = 0",
                  "Resumo da história de Moçambique",
                  "Estrutura de um trabalho académico",
                ].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-lg border bg-card px-3 py-2 text-left text-sm hover:bg-accent">{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages
            .filter((m) => {
              if (!searchTerm) return true;
              const txt = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
              return txt.toLowerCase().includes(searchTerm.toLowerCase());
            })
            .map((m) => {
            const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${isUser ? "rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground shadow-soft" : "prose prose-sm max-w-none"}`}>
                  {isUser ? <p className="whitespace-pre-wrap">{text}</p> : <ReactMarkdown>{text}</ReactMarkdown>}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A pensar...
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t bg-card p-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Faça uma pergunta..."
            rows={1}
            className="min-h-[44px] resize-none"
            disabled={loading}
          />
          <Button onClick={onSend} disabled={!input.trim() || loading} className="bg-gradient-hero h-11 w-11 p-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Sem plano? <Link to="/planos" className="text-primary hover:underline">Veja os planos</Link>
        </p>
      </div>
    </div>
  );
}
