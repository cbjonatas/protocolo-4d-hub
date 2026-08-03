import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  ExternalLink,
  Lock,
  Loader2,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchFullCourse, DEFAULT_EXAMS, computeStatus, formatReleaseDate } from "@/lib/course-data";
import { PdfViewer } from "@/components/pdf-viewer";
import { VideoPlayer } from "@/components/video-player";

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
  const [openPdf, setOpenPdf] = useState<{ path: string; title: string } | null>(null);
  const [openVideo, setOpenVideo] = useState(false);
  const { data: courseData } = useQuery({
    queryKey: ["course-full", slug],
    queryFn: () => fetchFullCourse(slug),
  });
  const { data: exam } = useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      const { data } = await supabase.from("mock_exams").select("*").eq("id", examId).maybeSingle();
      return data ?? DEFAULT_EXAMS.find((e) => e.id === examId) ?? DEFAULT_EXAMS[0];
    },
  });

  const complete = useMutation({
    mutationFn: async (done: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Usuário não autenticado.");
      if (done) {
        const { error } = await supabase
          .from("exam_progress")
          .insert({ user_id: u.user.id, exam_id: examId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("exam_progress")
          .delete()
          .eq("user_id", u.user.id)
          .eq("exam_id", examId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-full", slug] });
      toast.success("Progresso atualizado.");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar progresso."),
  });

  if (!exam || !courseData)
    return <div className="container mx-auto px-4 py-10 text-muted-foreground">Carregando...</div>;

  const { status, releaseDate } = computeStatus(
    exam.release_offset_days,
    courseData.enrollment?.enrolled_at,
    courseData.examProgress.has(exam.id),
  );
  const done = courseData.examProgress.has(exam.id);
  const anyExam = exam as any;

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
    <div className="container mx-auto max-w-4xl px-4 py-8">
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
        {exam.description && <p className="mt-4 text-muted-foreground">{exam.description}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Card
            icon={<FileText className="h-5 w-5 text-gold" />}
            title="PDF do Simulado"
            available={!!anyExam.pdf_path || !!exam.external_url}
            onClick={() => {
              if (anyExam.pdf_path)
                setOpenPdf({ path: anyExam.pdf_path, title: `${exam.title} — Simulado` });
              else if (exam.external_url) window.open(exam.external_url, "_blank");
            }}
            hint={
              anyExam.pdf_path
                ? "Visualizar/baixar"
                : exam.external_url
                  ? "Abrir link"
                  : "Não configurado"
            }
          />
          <Card
            icon={<FileText className="h-5 w-5 text-gold" />}
            title="Gabarito"
            available={!!anyExam.answer_key_path || !!exam.answer_key_url}
            onClick={() => {
              if (anyExam.answer_key_path)
                setOpenPdf({ path: anyExam.answer_key_path, title: `${exam.title} — Gabarito` });
              else if (exam.answer_key_url) window.open(exam.answer_key_url, "_blank");
            }}
            hint={
              anyExam.answer_key_path
                ? "Visualizar/baixar"
                : exam.answer_key_url
                  ? "Abrir link"
                  : "Não configurado"
            }
          />
          <Card
            icon={<Video className="h-5 w-5 text-gold" />}
            title="Vídeo de Correção"
            available={!!anyExam.correction_video_url || !!exam.correction_url}
            onClick={() => setOpenVideo(true)}
            hint={
              anyExam.correction_video_url || exam.correction_url
                ? "Assistir aqui"
                : "Não configurado"
            }
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            onClick={() => complete.mutate(!done)}
            disabled={complete.isPending}
            className={
              done ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-primary shadow-glow"
            }
          >
            {complete.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {done ? "Concluído — desmarcar" : "Marcar como concluído"}
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={!!openPdf} onOpenChange={(v) => !v && setOpenPdf(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{openPdf?.title}</DialogTitle>
          </DialogHeader>
          {openPdf && <PdfViewer filePath={openPdf.path} title={openPdf.title} />}
        </DialogContent>
      </Dialog>

      <Dialog open={openVideo} onOpenChange={setOpenVideo}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vídeo de Correção — {exam.title}</DialogTitle>
          </DialogHeader>
          {openVideo && (
            <VideoPlayer
              videoUrl={anyExam.correction_video_url || exam.correction_url}
              title={`Correção — ${exam.title}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({
  icon,
  title,
  available,
  onClick,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  available: boolean;
  onClick: () => void;
  hint: string;
}) {
  return (
    <button
      disabled={!available}
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-background/60 p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold">{title}</span>
      </div>
      <span className="text-xs text-muted-foreground">{hint}</span>
      {available && (
        <ExternalLink className="mt-auto h-4 w-4 text-muted-foreground group-hover:text-primary" />
      )}
    </button>
  );
}
