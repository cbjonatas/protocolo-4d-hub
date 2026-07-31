import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, Target, FileText, Trophy, CheckCircle2, XCircle, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { fetchFullCourse } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/progresso")({
  head: () => ({
    meta: [
      { title: "Meu Progresso — Informática com Jhon" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProgressPage,
});

async function fetchQuizStats() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { attempts: 0, answered: 0, correct: 0 };
  const { data } = await supabase
    .from("question_attempts")
    .select("total, correct_count")
    .eq("user_id", u.user.id);
  const answered = (data ?? []).reduce((s, r) => s + (r.total ?? 0), 0);
  const correct = (data ?? []).reduce((s, r) => s + (r.correct_count ?? 0), 0);
  return { attempts: data?.length ?? 0, answered, correct };
}

function ProgressPage() {
  const { data } = useQuery({
    queryKey: ["course-full", "protocolo-4d"],
    queryFn: () => fetchFullCourse("protocolo-4d"),
  });
  const { data: quiz } = useQuery({ queryKey: ["quiz-stats"], queryFn: fetchQuizStats });
  if (!data)
    return <div className="container mx-auto px-4 py-10 text-muted-foreground">Carregando...</div>;

  const lTotal = data.lessons.length,
    gTotal = data.goals.length,
    eTotal = data.exams.length;
  const lDone = data.lessonProgress.size,
    gDone = data.goalProgress.size,
    eDone = data.examProgress.size;
  const total = lTotal + gTotal + eTotal;
  const done = lDone + gDone + eDone;
  const percent = total ? Math.round((done / total) * 100) : 0;

  const answered = quiz?.answered ?? 0;
  const correct = quiz?.correct ?? 0;
  const errors = Math.max(0, answered - correct);
  const acc = answered ? Math.round((correct / answered) * 100) : 0;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Meu Progresso</h1>
      <p className="mt-2 text-muted-foreground">Acompanhe sua evolução no curso PROTOCOLO 4D.</p>

      <div className="mt-8 rounded-2xl border border-border bg-gradient-hero p-8 shadow-elegant">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-gold">
            <Trophy className="h-7 w-7 text-gold-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold uppercase tracking-widest text-gold">
              Protocolo 4D
            </div>
            <h2 className="font-display text-xl font-bold">{percent}% concluído</h2>
          </div>
        </div>
        <Progress value={percent} className="mt-6 h-3" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={PlayCircle} label="Videoaulas" done={lDone} total={lTotal} />
        <StatCard icon={Target} label="Metas" done={gDone} total={gTotal} />
        <StatCard icon={FileText} label="Simulados" done={eDone} total={eTotal} />
      </div>

      <h2 className="mt-10 font-display text-2xl font-bold">Desempenho em questões</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <MiniStat icon={Target} label="Respondidas" value={answered} />
        <MiniStat
          icon={CheckCircle2}
          label="Acertos"
          value={correct}
          className="text-emerald-400"
        />
        <MiniStat icon={XCircle} label="Erros" value={errors} className="text-rose-400" />
        <MiniStat icon={Percent} label="Aproveitamento" value={`${acc}%`} className="text-gold" />
      </div>

      <h2 className="mt-10 font-display text-2xl font-bold">Ciclo Vigente</h2>
      <div className="mt-4 space-y-3">
        {(data.cycles.filter((c: any) => c.status === "ativo").length > 0
          ? data.cycles.filter((c: any) => c.status === "ativo")
          : [data.cycles[0]]
        ).map((c) => {
          const cLessons = data.lessons.filter((l) => l.cycle_id === c.id);
          const cGoals = data.goals.filter((g) => g.cycle_id === c.id);
          const cExams = data.exams.filter((e) => e.number === c.number);
          const cT = cLessons.length + cGoals.length + cExams.length;
          const cD =
            cLessons.filter((l) => data.lessonProgress.has(l.id)).length +
            cGoals.filter((g) => data.goalProgress.has(g.id)).length +
            cExams.filter((e) => data.examProgress.has(e.id)).length;
          const p = cT ? Math.round((cD / cT) * 100) : 0;
          return (
            <div key={c.id} className="rounded-xl border border-gold/30 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <span>Ciclo {c.number} — {c.title}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ATIVO
                  </span>
                </div>
                <div className="text-sm font-bold text-gold">
                  {cD}/{cT} · {p}%
                </div>
              </div>
              <Progress value={p} className="mt-2 h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  done,
  total,
}: {
  icon: any;
  label: string;
  done: number;
  total: number;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold">
        {done}
        <span className="text-lg text-muted-foreground">/{total}</span>
      </div>
      <Progress value={pct} className="mt-3 h-2" />
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-bold ${className ?? ""}`}>{value}</div>
    </div>
  );
}
