import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Shield, Lock, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const email = u.user.email?.toLowerCase() ?? "";
      if (email === "professorjonatasg@gmail.com") return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin");
      const isAdmin =
        email === "admin@protocolo4d.com" || (roles && roles.length > 0);
      if (isAdmin) throw redirect({ to: "/admin" });
    }
  },
  head: () => ({
    meta: [{ title: "Portal Admin — Acesso Restrito" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminLoginPage,
});

const adminLoginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "Informe a senha"),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = adminLoginSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);

    if (error || !data.user) {
      toast.error("Credenciais administrativas inválidas.");
      return;
    }

    const email = data.user.email?.toLowerCase() ?? "";
    if (email === "professorjonatasg@gmail.com") {
      toast.error("Esta conta não possui privilégios de Administrador.");
      await supabase.auth.signOut();
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin");
    const isAdmin =
      email === "admin@protocolo4d.com" || (roles && roles.length > 0);

    if (!isAdmin) {
      toast.error("Esta conta não possui privilégios de Administrador.");
      await supabase.auth.signOut();
      return;
    }

    toast.success("Acesso administrativo autorizado!");
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-12 selection:bg-gold selection:text-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold text-black shadow-glow border border-gold/50">
            <KeyRound className="h-8 w-8 fill-current" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-wider text-foreground">
            PORTAL ADMINISTRATIVO
          </h1>
          <p className="text-xs font-bold tracking-widest text-gold uppercase mt-1">
            PROTOCOLO 4D • ACESSO RESTRITO
          </p>
        </div>

        <div className="rounded-2xl tactical-card p-8 shadow-elegant">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="admin_email"
                className="text-xs font-bold uppercase tracking-wider text-foreground"
              >
                E-mail Administrativo
              </Label>
              <Input
                id="admin_email"
                name="email"
                type="email"
                placeholder="admin@protocolo4d.com"
                required
                className="bg-background/80"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="admin_password"
                className="text-xs font-bold uppercase tracking-wider text-foreground"
              >
                Senha de Acesso
              </Label>
              <Input
                id="admin_password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="bg-background/80"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-gold text-black font-extrabold shadow-glow h-12 uppercase tracking-wider"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar no Painel Admin"}
            </Button>
          </form>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-gold transition-colors">
            ← Ir para Área de Alunos
          </Link>
        </div>
      </div>
    </div>
  );
}
