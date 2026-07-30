import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Shield,
  Award,
  ChevronRight,
  CheckCircle2,
  UserCheck,
  Trophy,
  ArrowRight,
} from "lucide-react";
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
          "Preparação de elite em Informática para PF, PRF, Polícia Civil e Polícia Militar. Conheça a história e metodologia do Prof. Jônatas Gomes.",
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
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-gold/20">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
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
          <div className="hidden md:flex items-center gap-6 text-xs uppercase font-bold tracking-wider text-muted-foreground">
            <a href="#sobre" className="hover:text-gold transition-colors">
              Sobre o Professor
            </a>
            <a href="#metodologia" className="hover:text-gold transition-colors">
              Metodologia 4D
            </a>
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
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16 md:py-20 space-y-24">
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
            {["PF", "PRF", "PC-BA", "PM-BA", "PC-ES", "DEPEN", "PC-SE"].map((badge) => (
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
            <a href="#sobre">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 border-gold/40 text-gold font-bold hover:bg-gold/10 text-sm uppercase tracking-wider"
              >
                CONHEÇA O PROFESSOR
              </Button>
            </a>
          </div>
        </div>

        {/* Section: Quem é Jônatas Gomes? */}
        <section id="sobre" className="scroll-mt-24">
          <div className="tactical-card rounded-3xl p-8 md:p-12 relative overflow-hidden border border-gold/30 shadow-elegant">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -z-10 pointer-events-none" />

            <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Left Column: Photo & Badges */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="relative group w-full max-w-sm">
                  {/* Glowing background accent */}
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-gold opacity-30 blur-lg group-hover:opacity-50 transition duration-500" />

                  {/* Photo Container */}
                  <div className="relative rounded-2xl overflow-hidden border-2 border-gold/40 bg-card shadow-2xl">
                    <img
                      src="/prof-jonatas.jpg"
                      alt="Prof. Jônatas Gomes"
                      className="w-full h-auto object-cover transform group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 text-center">
                      <div className="font-display text-xl font-extrabold text-foreground tracking-wider">
                        JÔNATAS GOMES
                      </div>
                      <div className="text-xs font-bold text-gold uppercase tracking-widest">
                        Especialista em TI & Concursos Policiais
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stat Cards under photo */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-6">
                  <div className="bg-card/90 border border-gold/30 rounded-xl p-3 text-center">
                    <div className="font-display text-xl font-extrabold text-gold">15+</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Anos TI
                    </div>
                  </div>
                  <div className="bg-card/90 border border-gold/30 rounded-xl p-3 text-center">
                    <div className="font-display text-xl font-extrabold text-gold">+2.000</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Alunos
                    </div>
                  </div>
                  <div className="bg-card/90 border border-gold/30 rounded-xl p-3 text-center">
                    <div className="font-display text-xl font-extrabold text-gold">3x</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      Aprovado
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Narrative */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-gold">
                    <UserCheck className="h-4 w-4" /> Conheça Seu Mentor
                  </span>
                  <h2 className="mt-3 font-display text-3xl md:text-4xl font-extrabold tracking-wide text-foreground">
                    QUEM É <span className="text-gold">JÔNATAS GOMES</span>?
                  </h2>
                </div>

                <p className="text-base text-muted-foreground leading-relaxed font-sans">
                  Sou <strong className="text-foreground font-semibold">Jônatas Gomes</strong>, especialista em Tecnologia da Informação, formado em Análise e Desenvolvimento de Sistemas pelo Centro Universitário Jorge Amado (UNIJORGE), com mais de <strong className="text-gold font-bold">15 anos de experiência na área de tecnologia</strong>.
                </p>

                {/* Approvals Showcase */}
                <div className="p-4 rounded-2xl bg-background/60 border border-gold/25 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
                    <Trophy className="h-4 w-4" /> Aprovações em Concursos Públicos
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/80 border border-gold/20 text-xs font-semibold text-foreground">
                      <Shield className="h-4 w-4 text-gold flex-shrink-0" />
                      <span>GCM Salvador <span className="text-gold font-bold">(2019)</span></span>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/80 border border-gold/20 text-xs font-semibold text-foreground">
                      <Shield className="h-4 w-4 text-gold flex-shrink-0" />
                      <span>Polícia Federal <span className="text-gold font-bold">(2025)</span></span>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/80 border border-gold/20 text-xs font-semibold text-foreground">
                      <Shield className="h-4 w-4 text-gold flex-shrink-0" />
                      <span>Investigador PC-ES <span className="text-gold font-bold">(2026)</span></span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                    Essa trajetória me permitiu desenvolver uma <strong className="text-gold font-semibold">tática de preparação focada no que realmente cai nas provas</strong>.
                  </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed font-sans">
                  Nos últimos anos, já ajudei <strong className="text-foreground font-semibold">mais de 2.000 alunos</strong> em concursos policiais e militares, utilizando uma preparação baseada em análise de bancas, resolução de questões e estudo direcionado.
                </p>

                {/* 4 Pillars Summary */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-gold">
                    Dessa experiência nasceu o <span className="underline decoration-gold/40">PROTOCOLO 4D</span>:
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/50 border border-gold/20">
                      <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="text-foreground font-bold">Revisões Estratégicas</strong>
                        <p className="text-muted-foreground text-[11px] mt-0.5">Foco nos assuntos mais cobrados pelas bancas.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/50 border border-gold/20">
                      <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="text-foreground font-bold">Metas de Questões</strong>
                        <p className="text-muted-foreground text-[11px] mt-0.5">Aceleração contínua de desempenho.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/50 border border-gold/20">
                      <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="text-foreground font-bold">Simulados Direcionados</strong>
                        <p className="text-muted-foreground text-[11px] mt-0.5">Treinamento do ritmo real da prova.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/50 border border-gold/20">
                      <CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="text-foreground font-bold">Análise de Desempenho</strong>
                        <p className="text-muted-foreground text-[11px] mt-0.5">Correção cirúrgica de pontos fracos.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hoje, o <strong className="text-foreground font-semibold">Informática com Jhon</strong> é uma das principais referências em Informática para concursos em Salvador, com um projeto especializado exclusivamente na disciplina voltada para carreiras policiais.
                </p>

                {/* Quote Block */}
                <div className="p-4 rounded-xl border-l-4 border-gold bg-gold/10 text-foreground font-medium text-xs md:text-sm italic leading-relaxed">
                  "Meu objetivo é simples: ensinar você a estudar Informática do jeito certo, com foco no que realmente aumenta suas chances de aprovação."
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4D Cycles Section */}
        <div id="metodologia" className="scroll-mt-24">
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

        {/* Call to Action Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-card via-card/90 to-card border border-gold/40 p-8 md:p-12 text-center relative overflow-hidden shadow-glow">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-foreground tracking-wide">
              PRONTO PARA GARANTIR SUA APROVAÇÃO?
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Junte-se a mais de 2.000 alunos e comece hoje mesmo sua preparação direcionada em Informática.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="bg-gradient-gold text-black font-extrabold h-14 px-10 text-sm uppercase tracking-wider shadow-glow hover:scale-105 transition-transform"
              >
                <Link to="/auth" search={{ tab: "signup" }}>
                  INICIAR AGORA <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-6 py-10 border-t border-gold/20 text-center text-xs font-bold tracking-wider text-muted-foreground uppercase">
        © {new Date().getFullYear()} INFORMÁTICA COM JHON — PROTOCOLO 4D • CARREIRAS POLICIAIS
      </footer>
    </div>
  );
}

