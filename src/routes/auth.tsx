import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const authSearchSchema = z.object({
  tab: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: authSearchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Entrar — Informática com Jhon" },
      { name: "description", content: "Faça login ou crie sua conta na plataforma Informática com Jhon." },
      { property: "og:title", content: "Entrar — Informática com Jhon" },
      { property: "og:description", content: "Acesse o Protocolo 4D e comece sua preparação." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(search.tab ?? "signin");

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="font-display text-lg font-bold">
            Informática <span className="text-gold">com Jhon</span>
          </div>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <SignInForm onSuccess={() => navigate({ to: "/dashboard" })} />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpForm onSuccess={() => navigate({ to: "/dashboard" })} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha muito curta").max(200),
});

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error("E-mail ou senha incorretos.");
      return;
    }
    toast.success("Bem-vindo de volta!");
    onSuccess();
  }

  if (showForgot) return <ForgotPasswordForm onCancel={() => setShowForgot(false)} />;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" className="w-full bg-gradient-primary shadow-glow" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
      </Button>
      <button type="button" onClick={() => setShowForgot(true)} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
        Esqueci minha senha
      </button>
    </form>
  );
}

const signUpSchema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(30),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(200),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { message: "As senhas não coincidem", path: ["confirm"] });

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.full_name, whatsapp: parsed.data.whatsapp },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("registered") ? "Este e-mail já está cadastrado." : error.message);
      return;
    }
    toast.success("Conta criada! Bem-vindo à plataforma.");
    onSuccess();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup_email">E-mail</Label>
        <Input id="signup_email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input id="whatsapp" name="whatsapp" placeholder="(00) 00000-0000" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="signup_password">Senha</Label>
          <Input id="signup_password" name="password" type="password" autoComplete="new-password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </div>
      </div>
      <Button type="submit" className="w-full bg-gradient-primary shadow-glow" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar minha conta"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({ onCancel }: { onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email")?.toString().trim() ?? "";
    if (!z.string().email().safeParse(email).success) return toast.error("E-mail inválido");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Enviamos um e-mail com o link de recuperação.");
    onCancel();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">Recuperar senha</h3>
        <p className="text-sm text-muted-foreground">Informe seu e-mail para receber o link.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="forgot_email">E-mail</Label>
        <Input id="forgot_email" name="email" type="email" required />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Voltar</Button>
        <Button type="submit" className="flex-1 bg-gradient-primary" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
        </Button>
      </div>
    </form>
  );
}
