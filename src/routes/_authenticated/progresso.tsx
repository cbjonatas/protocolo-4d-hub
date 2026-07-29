import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, Target, FileText, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

function ProgressPage() {
  const { data } = useQuery({
    queryKey: ["course-full", "protocolo-4d"],
    queryFn: () => fetchFullCourse("protocolo-4d"),
  });
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

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
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
