import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, User, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/components/app-shell";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [{ title: "Meu Perfil — Informática com Jhon" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (me?.profile) {
      setFullName(me.profile.full_name ?? "");
      setWhatsapp(me.profile.whatsapp ?? "");
    }
  }, [me]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, whatsapp })
      .eq("id", me.user.id);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar.");
    qc.invalidateQueries({ queryKey: ["me"] });
    toast.success("Perfil atualizado.");
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = form.get("password")?.toString() ?? "";
    const confirm = form.get("confirm")?.toString() ?? "";
    if (password.length < 8) return toast.error("Senha muito curta");
    if (password !== confirm) return toast.error("Senhas não coincidem");
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPwLoading(false);
    if (error) return toast.error(error.message);
    (e.target as HTMLFormElement).reset();
    toast.success("Senha alterada.");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Meu Perfil</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form
          onSubmit={saveProfile}
          className="rounded-2xl border border-border bg-card p-6 shadow-elegant"
        >
          <div className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <User className="h-5 w-5 text-gold" /> Informações
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={me?.user.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-primary shadow-glow"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar alterações"}
            </Button>
          </div>
        </form>

        <form
          onSubmit={changePassword}
          className="rounded-2xl border border-border bg-card p-6 shadow-elegant"
        >
          <div className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <KeyRound className="h-5 w-5 text-gold" /> Alterar senha
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova senha</Label>
              <Input id="new_password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar</Label>
              <Input id="confirm_password" name="confirm" type="password" required />
            </div>
            <Button type="submit" disabled={pwLoading} variant="outline" className="w-full">
              {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar senha"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
