import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileText, ExternalLink, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fetchFullCourse, computeStatus, formatReleaseDate } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/curso/$slug/simulado/$examId")({
  head: () => ({
    meta: [{ title: "Simulado — Informática com Jhon" }, { name: "robots", content: "noindex" }],
  }),
  component: ExamPage,
});

function ExamPage() {
  const { slug, examId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: courseData } = useQuery({
    queryKey: ["course-full", slug],
    queryFn: () => fetchFullCourse(slug),
  });
  const { data: exam } = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () =>
      (await supabase.from("mock_exams").select("*").eq("id", examId).maybeSingle()).data,
  });

  const complete = useMutation({
    mutationFn: async (done: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error();
      if (done)
        await supabase.from("exam_progress").insert({ user_id: u.user.id, exam_id: examId });
      else
        await supabase
          .from("exam_progress")
          .delete()
          .eq("user_id", u.user.id)
          .eq("exam_id", examId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-full", slug] });
      toast.success("Progresso atualizado.");
    },
  });

  if (!exam || !courseData)
    return <div className="container mx-auto px-4 py-10 text-muted-foreground">Carregando...</div>;

  const { status, releaseDate } = computeStatus(
    exam.release_offset_days,
    courseData.enrollment?.enrolled_at,
    courseData.examProgress.has(exam.id),
  );
  const done = courseData.examProgress.has(exam.id);

  if (status === "locked") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-border bg-card p-10 shadow-elegant">
          <Lock className="mx-auto h-12 w-12 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold">
            Este simulado será liberado em breve.
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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/curso/$slug", params: { slug } })}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao curso
      </Button>

      <div className="mt-4 rounded-2xl border border-border bg-card p-8 shadow-elegant">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold">
              Simulado
            </div>
            <h1 className="font-display text-2xl font-bold">{exam.title}</h1>
          </div>
        </div>
        <p className="mt-4 text-muted-foreground">{exam.description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {exam.external_url ? (
            <Button
              asChild
              className="bg-gradient-gold text-black font-extrabold shadow-glow hover:brightness-110"
            >
              <a
                href={exam.external_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                <span>
                  {exam.external_url.toLowerCase().includes(".pdf")
                    ? "Baixar / Visualizar Prova em PDF"
                    : "Acessar Simulado Online"}
                </span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
              Arquivo PDF / Link do simulado ainda não disponibilizado pelo administrador.
            </div>
          )}
          <Button
            onClick={() => complete.mutate(!done)}
            disabled={complete.isPending}
            className={
              done
                ? "bg-emerald-600 hover:bg-emerald-700 font-bold"
                : "bg-gradient-police-blue shadow-glow font-bold"
            }
          >
            {complete.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {done ? "Simulado Concluído — desmarcar" : "Marcar Simulado como Concluído"}
              </>
            )}
          </Button>
        </div>

        {/* Embedded PDF Viewer if external_url is a PDF */}
        {exam.external_url &&
          (exam.external_url.toLowerCase().includes(".pdf") ||
            exam.external_url.includes("course-materials")) && (
            <div className="mt-8 rounded-xl border border-gold/30 bg-background overflow-hidden shadow-elegant">
              <div className="bg-muted/40 p-3 border-b border-border text-xs font-bold uppercase tracking-wider text-gold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Visualizador da Prova (PDF)
                </span>
                <a
                  href={exam.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-[11px]"
                >
                  Abrir em tela cheia ↗
                </a>
              </div>
              <iframe
                src={exam.external_url}
                className="w-full h-[600px] border-none"
                title="Prova em PDF do Simulado"
              />
            </div>
          )}
      </div>
    </div>
  );
}
