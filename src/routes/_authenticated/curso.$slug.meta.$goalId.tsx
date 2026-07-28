import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Target, ExternalLink, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fetchFullCourse, computeStatus, formatReleaseDate } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/curso/$slug/meta/$goalId")({
  head: () => ({ meta: [{ title: "Meta de Questões — Informática com Jhon" }, { name: "robots", content: "noindex" }] }),
  component: GoalPage,
});

function GoalPage() {
  const { slug, goalId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: courseData } = useQuery({ queryKey: ["course-full", slug], queryFn: () => fetchFullCourse(slug) });
  const { data: goal } = useQuery({
    queryKey: ["goal", goalId],
    queryFn: async () => (await supabase.from("question_goals").select("*").eq("id", goalId).maybeSingle()).data,
  });

  const complete = useMutation({
    mutationFn: async (done: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error();
      if (done) await supabase.from("goal_progress").insert({ user_id: u.user.id, goal_id: goalId });
      else await supabase.from("goal_progress").delete().eq("user_id", u.user.id).eq("goal_id", goalId);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["course-full", slug] }); toast.success("Progresso atualizado."); },
  });

  if (!goal || !courseData) return <div className="container mx-auto px-4 py-10 text-muted-foreground">Carregando...</div>;

  const { status, releaseDate } = computeStatus(goal.release_offset_days, courseData.enrollment?.enrolled_at, courseData.goalProgress.has(goal.id));
  const done = courseData.goalProgress.has(goal.id);

  if (status === "locked") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-border bg-card p-10 shadow-elegant">
          <Lock className="mx-auto h-12 w-12 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold">Esta meta será liberada em breve.</h1>
          <p className="mt-2 text-muted-foreground">Data prevista: <strong className="text-foreground">{formatReleaseDate(releaseDate)}</strong></p>
          <Button asChild variant="outline" className="mt-6"><Link to="/curso/$slug" params={{ slug }}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/curso/$slug", params: { slug } })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao curso
      </Button>

      <div className="mt-4 rounded-2xl border border-border bg-card p-8 shadow-elegant">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-gold">
            <Target className="h-6 w-6 text-gold-foreground" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold">Meta de Questões</div>
            <h1 className="font-display text-2xl font-bold">{goal.title}</h1>
          </div>
        </div>
        <p className="mt-4 text-muted-foreground">{goal.description}</p>
        <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
          <div className="text-sm text-muted-foreground">Quantidade de questões</div>
          <div className="mt-1 font-display text-3xl font-bold text-gold">{goal.question_count}</div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {goal.external_url && (
            <Button asChild variant="outline">
              <a href={goal.external_url} target="_blank" rel="noreferrer">
                Acessar questões <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            onClick={() => complete.mutate(!done)}
            disabled={complete.isPending}
            className={done ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-primary shadow-glow"}
          >
            {complete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <><CheckCircle2 className="mr-2 h-4 w-4" />{done ? "Concluída — desmarcar" : "Marcar como concluída"}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
