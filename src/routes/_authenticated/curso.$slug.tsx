import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PlayCircle,
  Target,
  FileText,
  Lock,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { fetchFullCourse, computeStatus, formatReleaseDate, type Status } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/curso/$slug")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.slug === "protocolo-4d" ? "Protocolo 4D" : "Curso"} — Informática com Jhon`,
      },
      { name: "description", content: "Módulos, videoaulas, metas e simulados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["course-full", slug],
    queryFn: () => fetchFullCourse(slug),
  });

  if (isLoading || !data)
    return (
      <div className="container mx-auto px-4 py-10 text-muted-foreground font-display text-lg tracking-widest animate-pulse">
        Carregando curso...
      </div>
    );

  const enrolledAt = data.enrollment?.enrolled_at;
  const totalItems = data.lessons.length + data.goals.length + data.exams.length;
  const doneItems = data.lessonProgress.size + data.goalProgress.size + data.examProgress.size;
  const percent = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="rounded-2xl tactical-card p-6 md:p-8 shadow-elegant relative overflow-hidden">
        <div className="text-xs font-extrabold uppercase tracking-widest text-gold mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gold animate-ping" /> CURSO PREPARATÓRIO
        </div>
        <h1 className="font-display text-3xl font-extrabold md:text-5xl text-foreground tracking-wide">
          {data.course.title}
        </h1>
        <p className="mt-3 max-w-2xl text-xs md:text-sm font-sans text-muted-foreground leading-relaxed">
          {data.course.description}
        </p>

        <div className="mt-6 max-w-md rounded-xl border border-gold/25 bg-background/80 p-4">
          <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-muted-foreground">PROGRESSO GERAL</span>
            <span className="text-gold font-extrabold">{percent}% CONCLUÍDO</span>
          </div>
          <Progress value={percent} className="h-3 bg-muted" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {data.cycles.map((cycle) => {
          const cLessons = data.lessons.filter((l) => l.cycle_id === cycle.id);
          const cGoals = data.goals.filter((g) => g.cycle_id === cycle.id);
          const cExams = data.exams.filter((e) => e.number === cycle.number);

          return (
            <div
              key={cycle.id}
              className="rounded-2xl tactical-card p-6 shadow-elegant hover:border-gold/60 transition-all"
            >
              <div className="flex items-start justify-between gap-3 border-b border-gold/20 pb-4">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-widest text-gold">
                    CICLO {cycle.number}D
                  </div>
                  <h2 className="mt-1 font-display text-xl font-extrabold tracking-wide text-foreground">
                    {cycle.title}
                  </h2>
                  <p className="mt-1 text-xs font-sans text-muted-foreground">
                    {cycle.description}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold text-black font-display text-xl font-extrabold shadow-glow">
                  {cycle.number}D
                </div>
              </div>

              <div className="mt-5 space-y-2.5">
                {cLessons.map((l) => {
                  const { status, releaseDate } = computeStatus(
                    l.release_offset_days,
                    enrolledAt,
                    data.lessonProgress.has(l.id),
                  );
                  return (
                    <ItemRow
                      key={l.id}
                      icon={PlayCircle}
                      label={l.title}
                      status={status}
                      releaseDate={releaseDate}
                      to="/curso/$slug/aula/$lessonId"
                      params={{ slug, lessonId: l.id }}
                    />
                  );
                })}
                {cGoals.map((g) => {
                  const { status, releaseDate } = computeStatus(
                    g.release_offset_days,
                    enrolledAt,
                    data.goalProgress.has(g.id),
                  );
                  return (
                    <ItemRow
                      key={g.id}
                      icon={Target}
                      label={g.title}
                      sub={`${g.question_count} questões`}
                      status={status}
                      releaseDate={releaseDate}
                      to="/curso/$slug/meta/$goalId"
                      params={{ slug, goalId: g.id }}
                    />
                  );
                })}
                {cExams.map((e) => {
                  const { status, releaseDate } = computeStatus(
                    e.release_offset_days,
                    enrolledAt,
                    data.examProgress.has(e.id),
                  );
                  return (
                    <ItemRow
                      key={e.id}
                      icon={FileText}
                      label={e.title}
                      status={status}
                      releaseDate={releaseDate}
                      to="/curso/$slug/simulado/$examId"
                      params={{ slug, examId: e.id }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemRow({
  icon: Icon,
  label,
  sub,
  status,
  releaseDate,
  to,
  params,
}: {
  icon: any;
  label: string;
  sub?: string;
  status: Status;
  releaseDate: Date | null;
  to: any;
  params: any;
}) {
  const locked = status === "locked";
  const done = status === "completed";
  const statusBadge = {
    locked: {
      text: `Libera em ${formatReleaseDate(releaseDate)}`,
      cls: "text-muted-foreground",
      Icon: Lock,
    },
    available: { text: "Disponível", cls: "text-primary", Icon: Circle },
    in_progress: { text: "Em andamento", cls: "text-gold", Icon: Circle },
    completed: { text: "Concluído", cls: "text-emerald-400", Icon: CheckCircle2 },
  }[status];

  const inner = (
    <div
      className={`group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors ${locked ? "bg-muted/30 opacity-70" : "bg-background/60 hover:border-primary/50 hover:bg-accent/40"}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${done ? "bg-emerald-500/20 text-emerald-400" : locked ? "bg-muted text-muted-foreground" : "bg-gradient-primary text-primary-foreground"}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{label}</div>
        <div className={`mt-0.5 flex items-center gap-1 text-xs ${statusBadge.cls}`}>
          <statusBadge.Icon className="h-3 w-3" /> {statusBadge.text}
          {sub && <span className="text-muted-foreground">• {sub}</span>}
        </div>
      </div>
      {!locked && (
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
      )}
    </div>
  );

  if (locked) return inner;
  return (
    <Link to={to} params={params}>
      {inner}
    </Link>
  );
}
