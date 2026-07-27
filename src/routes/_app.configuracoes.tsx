import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, LogOut, Moon } from "lucide-react";
import { toast } from "sonner";

const EMOJIS = ["🎓", "📚", "🧠", "🚀", "⭐", "🦁", "🌟", "💡", "🔥", "🐘", "🏆", "🎯"];

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Way Estudantes AI" },
      { name: "description", content: "Gira os dados da sua conta, foto de perfil, notificações e preferências da plataforma." },
      { property: "og:title", content: "Configurações — Way Estudantes AI" },
      { property: "og:description", content: "Dados da conta, avatar, notificações e tema." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emoji, setEmoji] = useState("🎓");
  const [dark, setDark] = useState(false);
  const [notif, setNotif] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setNome(profile.nome ?? "");
    setApelido(profile.apelido ?? "");
    setTelefone(profile.telefone ?? "");
    setEmoji(profile.emoji ?? "🎓");
  }, [profile]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark(v: boolean) {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    localStorage.setItem("way-theme", v ? "dark" : "light");
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ nome, apelido, telefone, emoji }).eq("id", profile!.id);
    setSaving(false);
    if (error) return toast.error("Erro ao guardar.", { description: error.message });
    qc.invalidateQueries({ queryKey: ["my-profile"] });
    toast.success("Configurações guardadas.");
  }

  return (
    <div className="mx-auto max-w-2xl p-5 pb-28 md:p-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-hero text-primary-foreground">
          <Settings className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-semibold">Dados da conta</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="n">Nome</Label>
            <Input id="n" value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="a">Apelido</Label>
            <Input id="a" value={apelido} onChange={(e) => setApelido(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="t">Telefone</Label>
            <Input id="t" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={profile?.email ?? ""} disabled className="mt-1.5" />
          </div>
        </div>

        <div>
          <Label>Foto de perfil (emoji)</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`grid h-10 w-10 place-items-center rounded-lg border text-xl ${emoji === e ? "border-primary bg-primary/10" : ""}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={() => void save()} disabled={saving} className="bg-gradient-hero">
          {saving ? "A guardar..." : "Guardar alterações"}
        </Button>
      </div>

      <div className="mt-4 space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-semibold">Preferências</h2>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm"><Moon className="h-4 w-4" /> Tema escuro</span>
          <Switch checked={dark} onCheckedChange={toggleDark} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Notificações da plataforma</span>
          <Switch checked={notif} onCheckedChange={setNotif} />
        </div>
      </div>

      <Button
        variant="outline"
        className="mt-4 w-full"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/" });
        }}
      >
        <LogOut className="mr-2 h-4 w-4" /> Terminar sessão
      </Button>
    </div>
  );
}
