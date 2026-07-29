import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  ArrowRight,
  Trophy,
  Target,
  PlayCircle,
  Flame,
  CheckCircle,
  Sparkles,
  Shield,
} from "lucide-react";
import { fetchFullCourse } from "@/lib/course-data";
import { useMe } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meu Painel — Informática com Jhon" },
      { name: "description", content: "Seu painel de estudos, cursos e progresso." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

async function fetchMyCourses() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data: enrolls } = await supabase
    .from("enrollments")
    .select("course_id, enrolled_at, courses(*)")
    .eq("user_id", u.user.id);
  return enrolls ?? [];
}

function Dashboard() {
  const { data: me } = useMe();
  const { data: enrollments = [] } = useQuery({
    queryKey: ["my-courses"],
    queryFn: fetchMyCourses,
  });
  const firstName = me?.profile?.full_name?.split(" ")[0] ?? "aluno";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header & Welcome */}
      <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center rounded-2xl tactical-card p-6 md:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold border border-gold/30 mb-3">
            <Shield className="h-3.5 w-3.5 fill-current" /> CARREIRAS POLICIAIS
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide md:text-4xl text-foreground">
            OLÁ, <span className="text-gold">{firstName}</span> 👋
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-sans max-w-xl">
            Sua plataforma de preparação contínua rumo à aprovação no Protocolo 4D.
          </p>
        </div>

        <div className="inline-flex items-center gap-4 rounded-xl border border-gold/30 bg-gold/10 p-4 shadow-glow shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold text-black font-extrabold">
            <Flame className="h-7 w-7 fill-current animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-gold">
              SEQUÊNCIA DE ESTUDOS
            </div>
            <div className="text-sm font-bold text-foreground">ATIVO HOJE 🔥</div>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-5 font-display text-xl font-bold tracking-wider flex items-center gap-2 text-foreground">
          <Target className="h-5 w-5 text-gold" /> MEUS CURSOS
        </h2>
        {enrollments.length === 0 ? (
          <div className="tactical-card rounded-2xl p-10 text-center">
            <Shield className="mx-auto h-12 w-12 text-gold opacity-50 mb-3" />
            <p className="text-muted-foreground font-sans">Você ainda não tem cursos ativos.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e: any) => (
              <CourseCard
                key={e.course_id}
                courseId={e.course_id}
                slug={e.courses.slug}
                title={e.courses.title}
                description={e.courses.description}
                coverUrl={e.courses.cover_url}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CourseCard({
  courseId,
  slug,
  title,
  description,
  coverUrl,
}: {
  courseId: string;
  slug: string;
  title: string;
  description: string;
  coverUrl?: string;
}) {
  const { data } = useQuery({
    queryKey: ["course-full", slug],
    queryFn: () => fetchFullCourse(slug),
  });

  const stats = computeStats(data);

  return (
    <div className="group overflow-hidden rounded-2xl tactical-card shadow-elegant transition-all duration-300 hover:border-gold hover:shadow-glow">
      <div className="relative aspect-video overflow-hidden bg-gradient-police-blue">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-hero">
            <div className="text-center p-4">
              <Trophy className="mx-auto h-12 w-12 text-gold animate-bounce" />
              <div className="mt-2 font-display text-2xl font-extrabold tracking-widest text-gold">
                {title}
              </div>
              <div className="mt-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                CURSO PREPARATÓRIO
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-3 right-3 rounded-md bg-gold px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-black shadow-md">
          PROTOCOLO 4D
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-display text-lg font-bold tracking-wider text-foreground">{title}</h3>
        <p className="mt-1 line-clamp-2 text-xs font-sans text-muted-foreground">{description}</p>

        <div className="mt-5 rounded-xl border border-gold/20 bg-background/60 p-3.5">
          <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-muted-foreground">DESEMPENHO GERAL</span>
            <span className="text-gold">{stats.percent}%</span>
          </div>
          <Progress value={stats.percent} className="h-2.5 bg-muted" />
          <div className="mt-3 flex justify-between gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <span className="inline-flex items-center gap-1">
              <PlayCircle className="h-3.5 w-3.5 text-gold" /> {stats.lessons}
            </span>
            <span className="inline-flex items-center gap-1">
              <Target className="h-3.5 w-3.5 text-gold" /> {stats.goals}
            </span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-gold" /> {stats.exams}
            </span>
          </div>
        </div>

        <Button
          asChild
          className="mt-5 w-full bg-gradient-gold text-black font-extrabold uppercase tracking-wider shadow-glow hover:brightness-110 h-11"
        >
          <Link to="/curso/$slug" params={{ slug }}>
            ACESSAR CURSO <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function computeStats(data: Awaited<ReturnType<typeof fetchFullCourse>> | undefined) {
  if (!data) return { percent: 0, lessons: "0/0", goals: "0/0", exams: "0/0" };
  const lTotal = data.lessons.length;
  const gTotal = data.goals.length;
  const eTotal = data.exams.length;
  const lDone = [...data.lessonProgress].length;
  const gDone = [...data.goalProgress].length;
  const eDone = [...data.examProgress].length;
  const total = lTotal + gTotal + eTotal;
  const done = lDone + gDone + eDone;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return {
    percent,
    lessons: `${lDone}/${lTotal}`,
    goals: `${gDone}/${gTotal}`,
    exams: `${eDone}/${eTotal}`,
  };
}
