import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ArrowRight, Trophy, Target, PlayCircle } from "lucide-react";
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
  const { data: enrollments = [] } = useQuery({ queryKey: ["my-courses"], queryFn: fetchMyCourses });
  const firstName = me?.profile?.full_name?.split(" ")[0] ?? "aluno";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          Olá, <span className="text-gold">{firstName}</span> 👋
        </h1>
        <p className="mt-2 text-muted-foreground">Continue sua jornada rumo à aprovação.</p>
      </div>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">Meus Cursos</h2>
        {enrollments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Você ainda não tem cursos ativos.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e: any) => (
              <CourseCard key={e.course_id} courseId={e.course_id} slug={e.courses.slug} title={e.courses.title} description={e.courses.description} coverUrl={e.courses.cover_url} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CourseCard({ courseId, slug, title, description, coverUrl }: {
  courseId: string; slug: string; title: string; description: string; coverUrl?: string;
}) {
  const { data } = useQuery({
    queryKey: ["course-full", slug],
    queryFn: () => fetchFullCourse(slug),
  });

  const stats = computeStats(data);

  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-elegant transition-all hover:border-primary/50 hover:shadow-glow">
      <div className="relative aspect-video overflow-hidden bg-gradient-primary">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-hero">
            <div className="text-center">
              <Trophy className="mx-auto h-10 w-10 text-gold" />
              <div className="mt-2 font-display text-2xl font-bold tracking-widest">{title}</div>
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span className="font-semibold text-foreground">{stats.percent}%</span>
          </div>
          <Progress value={stats.percent} className="h-2" />
          <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><PlayCircle className="h-3 w-3" /> {stats.lessons}</span>
            <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" /> {stats.goals}</span>
            <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {stats.exams}</span>
          </div>
        </div>

        <Button asChild className="mt-5 w-full bg-gradient-primary shadow-glow">
          <Link to="/curso/$slug" params={{ slug }}>
            Acessar Curso <ArrowRight className="ml-1 h-4 w-4" />
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
