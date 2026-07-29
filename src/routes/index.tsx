import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Shield, Target, Award, ChevronRight, CheckCircle2 } from "lucide-react";
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
      { title: "Protocolo 4D — Informática para Carreiras Policiais" },
      {
        name: "description",
        content:
          "Preparação de elite em Informática para PF, PRF, Polícia Civil e Polícia Militar. Treinamento com a metodologia Protocolo 4D.",
      },
      { property: "og:title", content: "Protocolo 4D — Informática para Carreiras Policiais" },
      {
        property: "og:description",
        content: "Videoaulas, metas de questões e simulados para sua aprovação policial.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero text-foreground selection:bg-gold selection:text-black">
      {/* Top Header */}
      <header className="container mx-auto flex items-center justify-between px-6 py-6 border-b border-gold/20">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-black shadow-glow font-bold border border-gold/50">
            <Shield className="h-6 w-6 fill-current" />
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-wider text-foreground">
              INFORMÁTICA <span className="text-gold">COM JHON</span>
            </div>
            <div className="text-[10px] font-bold tracking-widest text-gold uppercase">
              CARREIRAS POLICIAIS
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            asChild
            className="text-xs uppercase font-bold tracking-wider hover:text-gold"
          >
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-gold text-black font-extrabold text-xs uppercase tracking-wider shadow-glow hover:brightness-110"
          >
            <Link to="/auth" search={{ tab: "signup" }}>
              Criar conta
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 text-xs font-bold uppercase tracking-widest text-gold shadow-glow">
            <Award className="h-4 w-4" /> Preparação Especializada para Carreiras Policiais
          </span>
          <h1 className="mt-8 font-display text-4xl font-extrabold tracking-wide leading-tight md:text-6xl text-foreground">
            INFORMÁTICA DE ALTA PERFORMANCE PARA{" "}
            <span className="text-gold underline decoration-gold/40 underline-offset-8">
              CARREIRAS POLICIAIS
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed md:text-xl font-sans">
            Domine os conteúdos mais cobrados da Polícia Federal, Polícia Rodoviária Federal,
            Polícias Civis e Militares através da metodologia{" "}
            <strong className="text-gold">PROTOCOLO 4D</strong>.
          </p>

          {/* Badges Corporações */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {["PF", "PRF", "PC-BA", "PM-BA", "DEPEN", "PC-SE"].map((badge) => (
              <span
                key={badge}
                className="rounded-lg border border-gold/30 bg-card/80 px-3.5 py-1.5 text-xs font-bold tracking-widest text-gold shadow-sm"
              >
                🎯 {badge}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="bg-gradient-gold text-black font-extrabold h-14 px-10 text-sm uppercase tracking-wider shadow-glow hover:scale-105 transition-transform"
            >
              <Link to="/auth" search={{ tab: "signup" }}>
                COMEÇAR AGORA <ChevronRight className="ml-1 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-14 px-8 border-gold/40 text-gold font-bold hover:bg-gold/10 text-sm uppercase tracking-wider"
            >
              <Link to="/auth">JÁ SOU ALUNO</Link>
            </Button>
          </div>
        </div>

        {/* 4D Cycles Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <div className="text-xs font-bold uppercase tracking-widest text-gold">
              METODOLOGIA PROTOCOLO 4D
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-wider">
              OS 4 CICLOS DA SUA APROVAÇÃO
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                num: "1D",
                title: "Fundamentos Teóricos",
                desc: "Teoria objetiva e direcionada para a banca do seu concurso.",
              },
              {
                num: "2D",
                title: "Fixação com Questões",
                desc: "Metas semanais de questões para consolidar o aprendizado.",
              },
              {
                num: "3D",
                title: "Simulados Direcionados",
                desc: "Simulados cronometrados para treinar tempo e estratégia de prova.",
              },
              {
                num: "4D",
                title: "Revisão Final",
                desc: "Revisão de alto rendimento antes do dia da prova.",
              },
            ].map((c) => (
              <div
                key={c.num}
                className="tactical-card rounded-2xl p-6 relative overflow-hidden transition-transform hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold text-black font-display font-extrabold text-xl shadow-glow">
                  {c.num}
                </div>
                <h3 className="mt-5 font-display text-lg font-bold tracking-wider text-foreground">
                  {c.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground font-sans">
                  {c.desc}
                </p>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-gold uppercase tracking-wider">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Módulo Disponível
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-6 py-10 border-t border-gold/20 text-center text-xs font-bold tracking-wider text-muted-foreground uppercase">
        © {new Date().getFullYear()} INFORMÁTICA COM JHON — PROTOCOLO 4D • CARREIRAS POLICIAIS
      </footer>
    </div>
  );
}
