import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perfil")({ component: PerfilPage });

const EMOJIS = ["🎓", "📚", "🧠", "✨", "🚀", "🦁", "🌟", "💡", "🎯", "🏆", "👨🏾‍🎓", "👩🏾‍🎓"];

function PerfilPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ nome: "", apelido: "", telefone: "", emoji: "🎓", nivel: "secundario" as "secundario" | "superior" });

  useEffect(() => {
    if (profile) setForm({
      nome: profile.nome, apelido: profile.apelido, telefone: profile.telefone,
      emoji: profile.emoji ?? "🎓", nivel: profile.nivel,
    });
  }, [profile]);

  async function save() {
    const { error } = await supabase.from("profiles").update(form).eq("id", profile!.id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado!");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!profile) return <div className="p-10 text-muted-foreground">A carregar...</div>;

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold">Meu Perfil</h1>

      <Card className="mt-6 p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-hero text-3xl text-primary-foreground">{form.emoji}</div>
          <div>
            <p className="font-semibold">{profile.email}</p>
            <p className="text-xs capitalize text-muted-foreground">Plano: <span className="font-medium text-primary">{profile.current_plan}</span></p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="space-y-2"><Label>Apelido</Label><Input value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} /></div>
          <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Nível</Label>
            <Select value={form.nivel} onValueChange={(v) => setForm({ ...form, nivel: v as "secundario" | "superior" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="secundario">Secundário</SelectItem>
                <SelectItem value="superior">Superior</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>Emoji</Label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => setForm({ ...form, emoji: e })}
                className={`h-10 w-10 rounded-lg border text-xl transition ${form.emoji === e ? "border-primary bg-primary-soft" : "hover:bg-accent"}`}>{e}</button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={save} className="bg-gradient-hero">Guardar</Button>
          <Button variant="outline" onClick={logout}>Terminar sessão</Button>
        </div>
      </Card>
    </div>
  );
}
