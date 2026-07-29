import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Target,
  Lock,
  Loader2,
  RotateCcw,
  Trophy,
  XCircle,
  FileText,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchFullCourse, computeStatus, formatReleaseDate } from "@/lib/course-data";
import { PdfViewer } from "@/components/pdf-viewer";

export const Route = createFileRoute("/_authenticated/curso/$slug/meta/$goalId")({
  head: () => ({
    meta: [
      { title: "Meta de Questões — Informática com Jhon" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GoalPage,
});

type Question = {
  id: string;
  statement: string;
  explanation: string;
  order_index: number;
  options: {
    id: string;
    label: string;
    content: string;
    is_correct: boolean;
    order_index: number;
  }[];
};

async function fetchGoalQuestions(goalId: string): Promise<Question[]> {
  const { data: qs } = await supabase
    .from("questions")
    .select(
      "id, statement, explanation, order_index, is_published, question_options(id, label, content, is_correct, order_index)",
    )
    .eq("goal_id", goalId)
    .eq("is_published", true)
    .order("order_index");
  return (qs ?? []).map((q: any) => ({
    id: q.id,
    statement: q.statement,
    explanation: q.explanation,
    order_index: q.order_index,
    options: (q.question_options ?? [])
      .slice()
      .sort((a: any, b: any) => a.order_index - b.order_index),
  }));
}

function GoalPage() {
  const { slug, goalId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: courseData } = useQuery({
    queryKey: ["course-full", slug],
    queryFn: () => fetchFullCourse(slug),
  });
  const { data: goal } = useQuery({
    queryKey: ["goal", goalId],
    queryFn: async () =>
      (await supabase.from("question_goals").select("*").eq("id", goalId).maybeSingle()).data,
  });
  const { data: questions, isLoading: qLoading } = useQuery({
    queryKey: ["goal-questions", goalId],
    queryFn: () => fetchGoalQuestions(goalId),
  });
  const { data: attempts } = useQuery({
    queryKey: ["goal-attempts", goalId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("question_attempts")
        .select("*")
        .eq("goal_id", goalId)
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Quiz state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState<null | { correct: number; total: number }>(null);
  const [openPdf, setOpenPdf] = useState(false);

  const complete = useMutation({
    mutationFn: async (done: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error();
      if (done)
        await supabase.from("goal_progress").insert({ user_id: u.user.id, goal_id: goalId });
      else
        await supabase
          .from("goal_progress")
          .delete()
          .eq("user_id", u.user.id)
          .eq("goal_id", goalId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-full", slug] });
    },
  });

  const submitAttempt = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !questions) throw new Error();

      const rows = questions.map((q) => {
        const selected = answers[q.id];
        const opt = q.options.find((o) => o.id === selected);
        return {
          question_id: q.id,
          selected_option_id: selected ?? null,
          is_correct: !!opt?.is_correct,
        };
      });
      const correct = rows.filter((r) => r.is_correct).length;

      const { data: att, error: attErr } = await supabase
        .from("question_attempts")
        .insert({
          user_id: u.user.id,
          goal_id: goalId,
          total: questions.length,
          correct_count: correct,
          finished_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (attErr || !att) throw new Error(attErr?.message);

      await supabase
        .from("question_answers")
        .insert(rows.map((r) => ({ ...r, attempt_id: att.id })));
      return { correct, total: questions.length };
    },
    onSuccess: (res) => {
      setFinished(res);
      qc.invalidateQueries({ queryKey: ["goal-attempts", goalId] });
      if (res.correct >= Math.ceil(res.total * 0.7) && !courseData?.goalProgress.has(goalId)) {
        complete.mutate(true);
      }
      toast.success("Meta finalizada!");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar tentativa."),
  });

  const percent = useMemo(() => {
    if (!questions || questions.length === 0) return 0;
    return Math.round(((current + (finished ? 1 : 0)) / questions.length) * 100);
  }, [current, finished, questions]);

  if (!goal || !courseData)
    return <div className="container mx-auto px-4 py-10 text-muted-foreground">Carregando...</div>;

  const { status, releaseDate } = computeStatus(
    goal.release_offset_days,
    courseData.enrollment?.enrolled_at,
    courseData.goalProgress.has(goal.id),
  );

  if (status === "locked") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-border bg-card p-10 shadow-elegant">
          <Lock className="mx-auto h-12 w-12 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold">
            Esta meta será liberada em breve.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Data prevista:{" "}
            <strong className="text-foreground">{formatReleaseDate(releaseDate)}</strong>
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/curso/$slug" params={{ slug }}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasQuestions = !!questions && questions.length > 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/curso/$slug", params: { slug } })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao curso
      </Button>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6 shadow-elegant md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-gold">
              <Target className="h-6 w-6 text-gold-foreground" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-gold">
                Meta de Questões
              </div>
              <h1 className="font-display text-2xl font-bold">{goal.title}</h1>
              {(goal as any).subject && (
                <div className="text-sm text-muted-foreground">Assunto: {(goal as any).subject}</div>
              )}
            </div>
          </div>
          {goal.pdf_path && (
            <Button variant="outline" size="sm" onClick={() => setOpenPdf(true)}>
              <FileText className="mr-2 h-4 w-4 text-gold" /> PDF Base de Estudo
            </Button>
          )}
        </div>

        {!hasQuestions && (
          <div className="mt-6">
            {qLoading ? (
              <div className="text-muted-foreground">Carregando questões...</div>
            ) : (
              <div className="rounded-xl border border-border bg-background/60 p-6 text-center">
                <p className="text-muted-foreground">
                  As questões desta meta ainda não foram publicadas.
                </p>
                {goal.external_url && (
                  <Button asChild className="mt-4" variant="outline">
                    <a href={goal.external_url} target="_blank" rel="noreferrer">
                      Acessar link externo
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {hasQuestions && !finished && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Questão {current + 1} de {questions!.length}
              </span>
              <span>{Object.keys(answers).length} respondidas</span>
            </div>
            <Progress value={percent} className="mt-2 h-2" />

            <div className="mt-6 rounded-xl border border-border bg-background/60 p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Questão {current + 1}
              </div>
              <p className="mt-2 whitespace-pre-wrap font-medium">
                {questions![current].statement}
              </p>
              <div className="mt-4 space-y-2">
                {questions![current].options.map((o) => {
                  const selected = answers[questions![current].id] === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setAnswers((a) => ({ ...a, [questions![current].id]: o.id }))}
                      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        {o.label}
                      </span>
                      <span className="text-sm">{o.content}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                disabled={current === 0}
                onClick={() => setCurrent((c) => c - 1)}
              >
                Anterior
              </Button>
              {current < questions!.length - 1 ? (
                <Button
                  className="bg-gradient-primary shadow-glow"
                  disabled={!answers[questions![current].id]}
                  onClick={() => setCurrent((c) => c + 1)}
                >
                  Próxima
                </Button>
              ) : (
                <Button
                  className="bg-gradient-primary shadow-glow"
                  disabled={
                    submitAttempt.isPending || Object.keys(answers).length < questions!.length
                  }
                  onClick={() => submitAttempt.mutate()}
                >
                  {submitAttempt.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Finalizar"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {finished && questions && (
          <ResultView
            questions={questions}
            answers={answers}
            correct={finished.correct}
            total={finished.total}
            onRestart={() => {
              setAnswers({});
              setCurrent(0);
              setFinished(null);
            }}
          />
        )}

        {attempts && attempts.length > 0 && !finished && hasQuestions && (
          <div className="mt-8">
            <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Histórico
            </h3>
            <ul className="mt-3 space-y-2">
              {attempts.slice(0, 5).map((a: any) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3 text-sm"
                >
                  <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                  <span className="font-semibold">
                    {a.correct_count}/{a.total} (
                    {Math.round((a.correct_count / Math.max(1, a.total)) * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Dialog open={openPdf} onOpenChange={setOpenPdf}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>PDF Base de Estudo — {goal.title}</DialogTitle>
          </DialogHeader>
          {openPdf && goal.pdf_path && <PdfViewer filePath={goal.pdf_path} title={goal.title} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultView({
  questions,
  answers,
  correct,
  total,
  onRestart,
}: {
  questions: Question[];
  answers: Record<string, string>;
  correct: number;
  total: number;
  onRestart: () => void;
}) {
  const pct = Math.round((correct / Math.max(1, total)) * 100);
  return (
    <div className="mt-6">
      <div className="rounded-2xl border border-border bg-gradient-hero p-6 text-center">
        <Trophy className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-2 font-display text-2xl font-bold">Resultado</h2>
        <div className="mt-2 flex justify-center gap-6 text-sm">
          <div>
            <span className="text-emerald-400 font-bold">{correct}</span> acertos
          </div>
          <div>
            <span className="text-rose-400 font-bold">{total - correct}</span> erros
          </div>
          <div>
            <span className="text-gold font-bold">{pct}%</span> aproveitamento
          </div>
        </div>
        <Button className="mt-4" variant="outline" onClick={onRestart}>
          <RotateCcw className="mr-1 h-4 w-4" /> Refazer
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {questions.map((q, i) => {
          const selected = answers[q.id];
          const correctOpt = q.options.find((o) => o.is_correct);
          const isCorrect = q.options.find((o) => o.id === selected)?.is_correct;
          return (
            <div
              key={q.id}
              className={`rounded-xl border p-4 ${isCorrect ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"}`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                {isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-400" />
                )}
                <span className="uppercase tracking-widest">Questão {i + 1}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium">{q.statement}</p>
              <div className="mt-3 space-y-1.5">
                {q.options.map((o) => {
                  const isSel = o.id === selected;
                  const isRight = o.is_correct;
                  return (
                    <div
                      key={o.id}
                      className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                        isRight
                          ? "bg-emerald-500/15 text-emerald-100"
                          : isSel
                            ? "bg-rose-500/15 text-rose-100"
                            : "bg-background/40 text-muted-foreground"
                      }`}
                    >
                      <span className="font-bold">{o.label}.</span> <span>{o.content}</span>
                      {isRight && <span className="ml-auto text-xs font-semibold">Correta</span>}
                      {!isRight && isSel && (
                        <span className="ml-auto text-xs font-semibold">Sua resposta</span>
                      )}
                    </div>
                  );
                })}
                {!selected && correctOpt && (
                  <div className="text-xs text-muted-foreground">Você não respondeu.</div>
                )}
              </div>
              {q.explanation && (
                <div className="mt-3 rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Comentário: </strong>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
