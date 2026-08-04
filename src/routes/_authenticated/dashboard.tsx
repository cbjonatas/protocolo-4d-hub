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
  Lock,
} from "lucide-react";
import { fetchFullCourse } from "@/lib/course-data";
import { useMe } from "@/components/app-shell";
import { getRegisteredStudents } from "@/lib/user-registry";

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
  
  // 1. Query all courses/protocols (active and draft/locked)
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  // 2. Query logged in user's active enrollments
  const { data: userEnrollments } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", u.user.id);

  // BUG 2 FIX: indexar matrículas tanto por course_id (UUID real) quanto por slug,
  // e incluir matrículas salvas no registro local.
  const enrolledCourseIds = new Set<string>();
  for (const e of userEnrollments ?? []) {
    enrolledCourseIds.add(e.course_id);
    const matchedCourse = (courses ?? []).find((c) => c.id === e.course_id);
    if (matchedCourse?.slug) enrolledCourseIds.add(matchedCourse.slug);
  }

  const localStudent = getRegisteredStudents().find(
    (s: any) => s.id === u.user.id || s.email?.toLowerCase() === u.user.email?.toLowerCase()
  );
  if (localStudent?.custom_enrollments) {
    for (const cSlug of localStudent.custom_enrollments) {
      enrolledCourseIds.add(cSlug);
    }
  }

  let list = [...(courses ?? [])];

  // Refine first course title if generic
  if (list.length > 0 && (list[0].title === "Protocolo 4D" || list[0].title === "PROTOCOLO 4D")) {
    list[0] = { ...list[0], title: "Protocolo 4D — Agosto" };
  }

  const existingSlugs = new Set(list.map((c) => c.slug));
  const defaults = [
    {
      id: "protocolo-agosto",
      slug: "protocolo-4d",
      title: "Protocolo 4D — Agosto",
      description: "Um protocolo estratégico de preparação com videoaulas, metas de questões e simulados.",
      cover_url: "",
      is_active: true,
      sort_order: 1,
    },
    {
      id: "protocolo-setembro",
      slug: "protocolo-4d-setembro",
      title: "Protocolo 4D — Setembro",
      description: "Protocolo estratégico do mês de Setembro com novas videoaulas, metas e simulados.",
      cover_url: "",
      is_active: false,
      sort_order: 2,
    },
    {
      id: "protocolo-outubro",
      slug: "protocolo-4d-outubro",
      title: "Protocolo 4D — Outubro",
      description: "Protocolo estratégico do mês de Outubro focado na reta final de preparação.",
      cover_url: "",
      is_active: false,
      sort_order: 3,
    },
  ];

  for (const d of defaults) {
    if (!existingSlugs.has(d.slug)) {
      list.push(d as any);
    }
  }

  return list.map((c) => {
    // BUG 2 FIX: verificar enrollment por id real E por slug
    const isEnrolled = enrolledCourseIds.has(c.id) || enrolledCourseIds.has(c.slug);
    return {
      ...c,
      is_enrolled: isEnrolled,
    };
  });
}

function Dashboard() {
  const { data: me } = useMe();
  const { data: courses = [] } = useQuery({
    queryKey: ["my-courses"],
    queryFn: fetchMyCourses,
    // BUG 1 FIX: staleTime 0 garante que o dashboard sempre busca dados frescos
    // do banco quando o aluno navega para cá, detectando remoções de matrícula
    // feitas pelo admin sem precisar que o aluno faça novo login.
    staleTime: 0,
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
          <Target className="h-5 w-5 text-gold" /> MEUS PROTOCOLOS & CURSOS
        </h2>
        {courses.length === 0 ? (
          <div className="tactical-card rounded-2xl p-10 text-center">
            <Shield className="mx-auto h-12 w-12 text-gold opacity-50 mb-3" />
            <p className="text-muted-foreground font-sans">Você ainda não possui protocolos liberados.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c: any) => (
              <CourseCard
                key={c.id}
                courseId={c.id}
                slug={c.slug}
                title={c.title}
                description={c.description}
                coverUrl={c.cover_url}
                isActive={c.is_active}
                isEnrolled={c.is_enrolled}
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
  isActive,
  isEnrolled,
}: {
  courseId: string;
  slug: string;
  title: string;
  description: string;
  coverUrl?: string;
  isActive?: boolean;
  isEnrolled?: boolean;
}) {
  const isUnlocked = !!isActive && !!isEnrolled;

  const { data } = useQuery({
    queryKey: ["course-full", slug],
    queryFn: () => fetchFullCourse(slug),
    enabled: isUnlocked,
  });

  const stats = computeStats(data);

  return (
    <div
      className={`group overflow-hidden rounded-2xl tactical-card shadow-elegant transition-all duration-300 ${
        isUnlocked ? "hover:border-gold hover:shadow-glow" : "border-border/40 opacity-85 hover:opacity-100"
      }`}
    >
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
              {isUnlocked ? (
                <Trophy className="mx-auto h-12 w-12 text-gold animate-bounce" />
              ) : (
                <Lock className="mx-auto h-12 w-12 text-muted-foreground/60" />
              )}
              <div className="mt-2 font-display text-xl font-extrabold tracking-widest text-gold">
                {title}
              </div>
              <div className="mt-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                CURSO PREPARATÓRIO
              </div>
            </div>
          </div>
        )}

        {/* Lock overlay for locked or non-enrolled courses */}
        {!isUnlocked && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-4">
            <div className="h-10 w-10 rounded-full bg-background/90 border border-gold/40 flex items-center justify-center mb-2 shadow-glow">
              <Lock className="h-5 w-5 text-gold" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">
              {!isEnrolled ? "MATRÍCULA NÃO ATIVA 🔒" : "LIBERA EM BREVE 🔒"}
            </span>
            {!isEnrolled && (
              <span className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
                Solicite a liberação deste mês ao administrador
              </span>
            )}
          </div>
        )}

        {/* Top Status Badge */}
        {isUnlocked ? (
          <div className="absolute top-3 right-3 rounded-md bg-emerald-500 text-black px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest shadow-md">
            MÊS ATIVO
          </div>
        ) : (
          <div className="absolute top-3 right-3 rounded-md bg-background/90 border border-border text-muted-foreground px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest shadow-md flex items-center gap-1">
            <Lock className="h-3 w-3" /> BLOQUEADO
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="font-display text-lg font-bold tracking-wider text-foreground">{title}</h3>
        <p className="mt-1 line-clamp-2 text-xs font-sans text-muted-foreground">{description}</p>

        {isUnlocked ? (
          <>
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
                ACESSAR CURSO <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </>
        ) : (
          <Button
            disabled
            variant="outline"
            className="mt-5 w-full border-border/60 text-muted-foreground font-bold uppercase tracking-wider h-11 cursor-not-allowed"
          >
            <Lock className="mr-1.5 h-4 w-4" /> BLOQUEADO — MATRICULE-SE 🔒
          </Button>
        )}
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
