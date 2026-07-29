import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileText, Download, Lock, Loader2, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchFullCourse, computeStatus, formatReleaseDate } from "@/lib/course-data";
import { VideoPlayer } from "@/components/video-player";
import { PdfViewer } from "@/components/pdf-viewer";

export const Route = createFileRoute("/_authenticated/curso/$slug/aula/$lessonId")({
  head: () => ({ meta: [{ title: "Videoaula — Informática com Jhon" }, { name: "robots", content: "noindex" }] }),
  component: LessonPage,
});

async function fetchLesson(lessonId: string) {
  const [{ data: lesson }, { data: materials }] = await Promise.all([
    supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle(),
    supabase.from("materials").select("*").eq("lesson_id", lessonId).order("sort_order"),
  ]);
  return { lesson, materials: materials ?? [] };
}

function LessonPage() {
  const { slug, lessonId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: courseData } = useQuery({ queryKey: ["course-full", slug], queryFn: () => fetchFullCourse(slug) });
  const { data } = useQuery({ queryKey: ["lesson", lessonId], queryFn: () => fetchLesson(lessonId) });

  const complete = useMutation({
    mutationFn: async (done: boolean) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error();
      if (done) {
        await supabase.from("lesson_progress").insert({ user_id: u.user.id, lesson_id: lessonId });
      } else {
        await supabase.from("lesson_progress").delete().eq("user_id", u.user.id).eq("lesson_id", lessonId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-full", slug] });
      toast.success("Progresso atualizado.");
    },
  });

  if (!data?.lesson || !courseData) return <div className="container mx-auto px-4 py-10 text-muted-foreground">Carregando...</div>;

  const lesson = data.lesson;
  const { status, releaseDate } = computeStatus(lesson.release_offset_days, courseData.enrollment?.enrolled_at, courseData.lessonProgress.has(lesson.id));
  const isCompleted = courseData.lessonProgress.has(lesson.id);

  if (status === "locked") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="rounded-2xl border border-border bg-card p-10 shadow-elegant">
          <Lock className="mx-auto h-12 w-12 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold">Esta aula será liberada em breve.</h1>
          <p className="mt-2 text-muted-foreground">Data prevista: <strong className="text-foreground">{formatReleaseDate(releaseDate)}</strong></p>
          <Button asChild variant="outline" className="mt-6"><Link to="/curso/$slug" params={{ slug }}><ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao curso</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/curso/$slug", params: { slug } })}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar ao curso
      </Button>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VideoPlayer
            videoUrl={lesson.video_url}
            videoFilePath={(lesson as any).video_file_path || undefined}
            title={lesson.title}
            onProgress={() => { if (!isCompleted) complete.mutate(true); }}
          />
          <h1 className="mt-6 font-display text-2xl font-bold md:text-3xl">{lesson.title}</h1>
          {lesson.description && <p className="mt-2 text-muted-foreground">{lesson.description}</p>}

          <Button
            onClick={() => complete.mutate(!isCompleted)}
            disabled={complete.isPending}
            className={`mt-6 ${isCompleted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-primary shadow-glow"}`}
          >
            {complete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <><CheckCircle2 className="mr-2 h-4 w-4" />{isCompleted ? "Concluído — desmarcar" : "Marcar como concluída"}</>
            )}
          </Button>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
          <h2 className="font-display text-lg font-semibold">Materiais de Apoio</h2>
          {data.materials.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum PDF disponível para esta aula.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.materials.map((m) => <MaterialItem key={m.id} title={m.title} filePath={m.file_path} />)}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function MaterialItem({ title, filePath }: { title: string; filePath: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-lg border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40">
        <FileText className="h-4 w-4 text-gold" />
        <span className="flex-1 truncate text-sm">{title}</span>
        <Eye className="h-4 w-4 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          {open && <PdfViewer filePath={filePath} title={title} />}
        </DialogContent>
      </Dialog>
    </li>
  );
}
