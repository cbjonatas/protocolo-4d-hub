import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchFullCourse } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/admin/cursos")({
  head: () => ({ meta: [{ title: "Admin — Cursos" }, { name: "robots", content: "noindex" }] }),
  component: AdminCourses,
});

function AdminCourses() {
  const { data: course } = useQuery({ queryKey: ["course-full", "protocolo-4d"], queryFn: () => fetchFullCourse("protocolo-4d") });
  const qc = useQueryClient();

  if (!course) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <h2 className="font-display text-xl font-bold">{course.course.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{course.course.description}</p>
        <div className="mt-3 inline-block rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
          {course.course.is_active ? "Ativo" : "Inativo"}
        </div>
      </div>

      {course.cycles.map((cycle) => {
        const cLessons = course.lessons.filter((l) => l.cycle_id === cycle.id);
        const cGoals = course.goals.filter((g) => g.cycle_id === cycle.id);
        const cExams = course.exams.filter((e) => e.number === cycle.number);
        return (
          <div key={cycle.id} className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
            <h3 className="font-display text-lg font-bold text-gold">Ciclo {cycle.number} — {cycle.title}</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Videoaulas</h4>
                <div className="space-y-2">
                  {cLessons.map((l) => <LessonEditor key={l.id} lesson={l} onSaved={() => qc.invalidateQueries({ queryKey: ["course-full", "protocolo-4d"] })} />)}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Metas</h4>
                <div className="space-y-2">
                  {cGoals.map((g) => <GoalEditor key={g.id} goal={g} onSaved={() => qc.invalidateQueries({ queryKey: ["course-full", "protocolo-4d"] })} />)}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Simulados</h4>
                <div className="space-y-2">
                  {cExams.map((e) => <ExamEditor key={e.id} exam={e} onSaved={() => qc.invalidateQueries({ queryKey: ["course-full", "protocolo-4d"] })} />)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditorCard({ title, sub, onEditContent }: { title: string; sub?: string; onEditContent: () => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{title}</div>
          {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost"><Edit3 className="h-4 w-4" /></Button>
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar</DialogTitle></DialogHeader>
        {open && onEditContent()}
      </DialogContent>
    </Dialog>
  );
}

function LessonEditor({ lesson, onSaved }: { lesson: any; onSaved: () => void }) {
  const save = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("lessons").update(form).eq("id", lesson.id);
      if (error) throw error;
    },
    onSuccess: () => { onSaved(); toast.success("Salvo."); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <EditorCard title={lesson.title} sub={lesson.video_url || "sem URL"} onEditContent={() => (
      <form onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save.mutate({
          title: f.get("title"), description: f.get("description"),
          video_url: f.get("video_url"),
          release_offset_days: Number(f.get("release_offset_days")),
        });
      }} className="space-y-3">
        <div className="space-y-1.5"><Label>Título</Label><Input name="title" defaultValue={lesson.title} required /></div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="description" defaultValue={lesson.description} /></div>
        <div className="space-y-1.5"><Label>URL do vídeo (YouTube/Vimeo)</Label><Input name="video_url" defaultValue={lesson.video_url} placeholder="https://youtu.be/..." /></div>
        <div className="space-y-1.5"><Label>Liberação (dias após matrícula)</Label><Input name="release_offset_days" type="number" min={0} defaultValue={lesson.release_offset_days} /></div>
        <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-primary">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
      </form>
    )} />
  );
}

function GoalEditor({ goal, onSaved }: { goal: any; onSaved: () => void }) {
  const save = useMutation({
    mutationFn: async (form: any) => { const { error } = await supabase.from("question_goals").update(form).eq("id", goal.id); if (error) throw error; },
    onSuccess: () => { onSaved(); toast.success("Salvo."); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
  return (
    <EditorCard title={goal.title} sub={`${goal.question_count} questões`} onEditContent={() => (
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save.mutate({ title: f.get("title"), description: f.get("description"), question_count: Number(f.get("question_count")), external_url: f.get("external_url"), release_offset_days: Number(f.get("release_offset_days")) }); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Título</Label><Input name="title" defaultValue={goal.title} required /></div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="description" defaultValue={goal.description} /></div>
        <div className="space-y-1.5"><Label>Qtd. de questões</Label><Input name="question_count" type="number" min={0} defaultValue={goal.question_count} /></div>
        <div className="space-y-1.5"><Label>Link externo</Label><Input name="external_url" defaultValue={goal.external_url} placeholder="https://..." /></div>
        <div className="space-y-1.5"><Label>Liberação (dias)</Label><Input name="release_offset_days" type="number" min={0} defaultValue={goal.release_offset_days} /></div>
        <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-primary">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
      </form>
    )} />
  );
}

function ExamEditor({ exam, onSaved }: { exam: any; onSaved: () => void }) {
  const save = useMutation({
    mutationFn: async (form: any) => { const { error } = await supabase.from("mock_exams").update(form).eq("id", exam.id); if (error) throw error; },
    onSuccess: () => { onSaved(); toast.success("Salvo."); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
  return (
    <EditorCard title={exam.title} sub={exam.external_url || "sem link"} onEditContent={() => (
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save.mutate({ title: f.get("title"), description: f.get("description"), external_url: f.get("external_url"), correction_url: f.get("correction_url"), answer_key_url: f.get("answer_key_url"), release_offset_days: Number(f.get("release_offset_days")) }); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Título</Label><Input name="title" defaultValue={exam.title} required /></div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea name="description" defaultValue={exam.description} /></div>
        <div className="space-y-1.5"><Label>Link do simulado</Label><Input name="external_url" defaultValue={exam.external_url} placeholder="https://..." /></div>
        <div className="space-y-1.5"><Label>Correção do simulado (link)</Label><Input name="correction_url" defaultValue={exam.correction_url ?? ""} placeholder="https://... (vídeo/PDF de correção)" /></div>
        <div className="space-y-1.5"><Label>Gabarito do simulado (link)</Label><Input name="answer_key_url" defaultValue={exam.answer_key_url ?? ""} placeholder="https://... (PDF/gabarito)" /></div>
        <div className="space-y-1.5"><Label>Liberação (dias)</Label><Input name="release_offset_days" type="number" min={0} defaultValue={exam.release_offset_days} /></div>
        <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-primary">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</Button>
      </form>
    )} />
  );
}
