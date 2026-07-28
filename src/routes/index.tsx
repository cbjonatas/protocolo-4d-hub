import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shield, Target, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Informática com Jhon — Preparação de elite para concursos" },
      { name: "description", content: "Plataforma exclusiva de preparação para concursos públicos e carreiras policiais. Curso Protocolo 4D com videoaulas, metas e simulados." },
      { property: "og:title", content: "Informática com Jhon — Preparação de elite" },
      { property: "og:description", content: "Videoaulas, metas de questões e simulados para potencializar sua aprovação." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="font-display text-lg font-bold tracking-tight">
            Informática <span className="text-gold">com Jhon</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Entrar</Link></Button>
          <Button asChild className="bg-gradient-primary shadow-glow"><Link to="/auth" search={{ tab: "signup" }}>Criar conta</Link></Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
            <Award className="h-3.5 w-3.5" /> Área de Membros Oficial
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-tight md:text-6xl">
            Preparação de <span className="text-gold">alta performance</span> para concursos e carreiras policiais.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Acesse o <strong className="text-foreground">PROTOCOLO 4D</strong>: videoaulas semanais, metas de questões e simulados dentro de uma plataforma pensada para sua aprovação.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="bg-gradient-primary shadow-glow h-12 px-8">
              <Link to="/auth" search={{ tab: "signup" }}>Começar agora</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 border-border">
              <Link to="/auth">Já sou aluno</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            { icon: Target, title: "Foco em resultado", desc: "Metodologia dividida em 4 ciclos progressivos." },
            { icon: TrendingUp, title: "Acompanhamento", desc: "Progresso individual em cada videoaula, meta e simulado." },
            { icon: Shield, title: "Conteúdo premium", desc: "Preparação direcionada para PMBA, PCBA e outras carreiras." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="container mx-auto px-6 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Informática com Jhon — Todos os direitos reservados.
      </footer>
    </div>
  );
}
