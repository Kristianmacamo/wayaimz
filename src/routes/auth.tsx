import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { GraduationCap, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar ou Criar Conta — Way Estudantes AI" },
      { name: "description", content: "Aceda à plataforma académica inteligente para estudantes moçambicanos." },
    ],
  }),
  component: AuthPage,
});

const EMOJIS = ["🎓", "📚", "✏️", "🧠", "⭐", "🚀", "💡", "🔬", "🎯", "📝"];

function AuthPage() {
  const { mode: initialMode, ref } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialMode ?? "login");
  const [loading, setLoading] = useState(false);

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [telefone, setTelefone] = useState("+258 ");
  const [nivel, setNivel] = useState<"secundario" | "superior">("secundario");
  const [emoji, setEmoji] = useState("🎓");

  useEffect(() => {
    // already signed in? go to chat
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/chat" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!nome || !apelido || !telefone || telefone.length < 8) {
          toast.error("Preencha todos os campos obrigatórios.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/chat",
            data: { nome, apelido, telefone, nivel, emoji, ref: ref ?? "" },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique o seu e-mail para confirmar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/chat" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-accent">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-4">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-display text-xl font-bold">Way Estudantes <span className="text-gradient">AI</span></span>
        </Link>

        <div className="w-full rounded-2xl border bg-card p-6 shadow-elegant md:p-8">
          <h1 className="font-display text-2xl font-bold">
            {mode === "login" ? "Entrar" : "Criar Conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Aceda à sua plataforma de estudo" : "Comece com 2 conversas grátis"}
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="apelido">Apelido</Label>
                    <Input id="apelido" value={apelido} onChange={(e) => setApelido(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tel">Telefone (Moçambique)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="pl-9" placeholder="+258 84 000 0000" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Nível de Ensino</Label>
                  <Select value={nivel} onValueChange={(v) => setNivel(v as "secundario" | "superior")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="secundario">Ensino Secundário</SelectItem>
                      <SelectItem value="superior">Ensino Superior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Escolha um emoji de perfil</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((e) => (
                      <button
                        type="button"
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={`grid h-10 w-10 place-items-center rounded-lg border text-xl transition ${emoji === e ? "border-primary bg-primary-soft" : "hover:bg-muted"}`}
                      >{e}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Palavra-passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="pwd" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required />
              </div>
            </div>

            <Button type="submit" className="w-full bg-gradient-hero" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "login" ? (
              <button onClick={() => setMode("signup")} className="text-primary hover:underline">
                Ainda não tem conta? <strong>Criar conta</strong>
              </button>
            ) : (
              <button onClick={() => setMode("login")} className="text-primary hover:underline">
                Já tem conta? <strong>Entrar</strong>
              </button>
            )}
          </div>
          {ref && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Convidado por afiliado: <strong className="text-secondary">{ref}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
