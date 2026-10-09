import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { GraduationCap, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
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

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const redirectTo = import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/chat`;
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo },
                });
                if (error) throw error;
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro Google");
                setLoading(false);
              }
            }}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continuar com Google
          </Button>

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
