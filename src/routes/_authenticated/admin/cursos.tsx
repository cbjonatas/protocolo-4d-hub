import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Edit3,
  Plus,
  Trash2,
  Upload,
  FileText,
  ExternalLink,
  PlayCircle,
  Target,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchFullCourse } from "@/lib/course-data";

export const Route = createFileRoute("/_authenticated/admin/cursos")({
  head: () => ({
    meta: [{ title: "Admin — Gestão de Cursos" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminCourses,
  errorComponent: ({ reset }) => (
    <div className="rounded-2xl tactical-card p-8 text-center space-y-4">
      <h3 className="font-display text-lg font-bold text-gold">Gestão de Cursos</h3>
      <p className="text-xs text-muted-foreground">
        Não foi possível carregar os cursos no momento.
      </p>
      <Button
        onClick={() => reset()}
        variant="outline"
        className="border-gold/40 text-gold font-bold"
      >
        Tentar Novamente
      </Button>
    </div>
  ),
});

function AdminCourses() {
  const { data: course } = useQuery({
    queryKey: ["course-full", "protocolo-4d"],
    queryFn: () => fetchFullCourse("protocolo-4d"),
  });
  const qc = useQueryClient();

  if (!course)
    return (
      <div className="p-8 text-center text-muted-foreground font-display">
        Carregando dados dos cursos...
      </div>
    );

  const refresh = () => qc.invalidateQueries({ queryKey: ["course-full", "protocolo-4d"] });

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gold uppercase tracking-widest">
              GERENCIADOR DE CURSOS
            </div>
            <h2 className="font-display text-2xl font-bold">{course.course.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{course.course.description}</p>
          </div>
          <div className="rounded-md bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
            {course.course.is_active ? "ATIVO" : "INATIVO"}
          </div>
        </div>
      </div>

      {/* Cycles Breakdown */}
      {course.cycles.map((cycle) => {
        const cLessons = course.lessons.filter((l) => l.cycle_id === cycle.id);
        const cGoals = course.goals.filter((g) => g.cycle_id === cycle.id);
        const cExams = course.exams.filter((e) => e.number === cycle.number);

        return (
          <div
            key={cycle.id}
            className="rounded-2xl border border-border bg-card p-6 shadow-elegant"
          >
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <h3 className="font-display text-xl font-bold text-gold">
                Ciclo {cycle.number} — {cycle.title}
              </h3>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* VIDEOAULAS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <PlayCircle className="h-4 w-4 text-gold" /> Videoaulas
                  </h4>
                  <CreateItemDialog
                    title="Cadastrar Nova Aula"
                    triggerText="+ Aula"
                    onSave={async (f) => {
                      const { error } = await supabase.from("lessons").insert({
                        cycle_id: cycle.id,
                        title: String(f.get("title") || ""),
                        description: String(f.get("description") || ""),
                        video_url: String(f.get("video_url") || ""),
                        release_offset_days: Number(f.get("release_offset_days") || 0),
                        sort_order: cLessons.length,
                      });
                      if (error) throw error;
                    }}
                    onSaved={refresh}
                  >
                    <LessonFormFields />
                  </CreateItemDialog>
                </div>

                <div className="space-y-2">
                  {cLessons.map((l) => (
                    <LessonEditor key={l.id} lesson={l} onSaved={refresh} />
                  ))}
                </div>
              </div>

              {/* METAS DE QUESTÕES SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-gold" /> Metas de Questões
                  </h4>
                  <CreateItemDialog
                    title="Cadastrar Meta de Questões"
                    triggerText="+ Meta"
                    onSave={async (f) => {
                      const { error } = await supabase.from("question_goals").insert({
                        cycle_id: cycle.id,
                        title: String(f.get("title") || ""),
                        description: String(f.get("description") || ""),
                        question_count: Number(f.get("question_count") || 10),
                        external_url: String(f.get("external_url") || ""),
                        release_offset_days: Number(f.get("release_offset_days") || 0),
                        sort_order: cGoals.length,
                      });
                      if (error) throw error;
                    }}
                    onSaved={refresh}
                  >
                    <GoalFormFields />
                  </CreateItemDialog>
                </div>

                <div className="space-y-2">
                  {cGoals.map((g) => (
                    <GoalEditor key={g.id} goal={g} onSaved={refresh} />
                  ))}
                </div>
              </div>

              {/* SIMULADOS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-gold" /> Simulados
                  </h4>
                  <CreateItemDialog
                    title="Cadastrar Novo Simulado"
                    triggerText="+ Simulado"
                    onSave={async (f) => {
                      let pdfUrl = String(f.get("external_url") || "");
                      const pdfFile = f.get("pdf_file") as File | null;
                      if (pdfFile && pdfFile.name && pdfFile.size > 0) {
                        const path = `simulados/${Date.now()}_${pdfFile.name}`;
                        const { error: uploadErr } = await supabase.storage
                          .from("course-materials")
                          .upload(path, pdfFile);
                        if (!uploadErr) {
                          const { data: publicData } = supabase.storage
                            .from("course-materials")
                            .getPublicUrl(path);
                          pdfUrl = publicData.publicUrl;
                        }
                      }
                      const { error } = await supabase.from("mock_exams").insert({
                        course_id: course.course.id,
                        number: cycle.number,
                        title: String(f.get("title") || ""),
                        description: String(f.get("description") || ""),
                        external_url: pdfUrl,
                        release_offset_days: Number(f.get("release_offset_days") || 0),
                        sort_order: cExams.length,
                      });
                      if (error) throw error;
                    }}
                    onSaved={refresh}
                  >
                    <ExamFormFields />
                  </CreateItemDialog>
                </div>

                <div className="space-y-2">
                  {cExams.map((e) => (
                    <ExamEditor key={e.id} exam={e} onSaved={refresh} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreateItemDialog({
  title,
  triggerText,
  children,
  onSave,
  onSaved,
}: {
  title: string;
  triggerText: string;
  children: React.ReactNode;
  onSave: (formData: FormData) => Promise<void>;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      await onSave(new FormData(e.currentTarget));
      toast.success("Cadastrado com sucesso!");
      setOpen(false);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-gold/40 text-gold text-[11px] font-bold uppercase hover:bg-gold/10"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {children}
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-gold text-black font-extrabold shadow-glow"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Cadastro"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LessonFormFields({ defaultValues }: { defaultValues?: any }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Título da Aula</Label>
        <Input
          name="title"
          defaultValue={defaultValues?.title}
          placeholder="Ex: Aula 01 — Conceitos de Hardware"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição / Resumo</Label>
        <Textarea
          name="description"
          defaultValue={defaultValues?.description}
          placeholder="Detalhamento sobre os tópicos da aula..."
        />
      </div>
      <div className="space-y-1.5">
        <Label>URL do Vídeo (YouTube, Vimeo, Google Drive ou MP4)</Label>
        <Input
          name="video_url"
          defaultValue={defaultValues?.video_url}
          placeholder="https://www.youtube.com/watch?v=... ou Google Drive"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Dias de Liberação (após a data de matrícula)</Label>
        <Input
          name="release_offset_days"
          type="number"
          min={0}
          defaultValue={defaultValues?.release_offset_days ?? 0}
        />
      </div>
    </>
  );
}

function GoalFormFields({ defaultValues }: { defaultValues?: any }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Título da Meta de Questões</Label>
        <Input
          name="title"
          defaultValue={defaultValues?.title}
          placeholder="Ex: Meta 01 — 50 Questões de Redes de Computadores"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição / Orientações</Label>
        <Textarea
          name="description"
          defaultValue={defaultValues?.description}
          placeholder="Orientações e metas para a resolução..."
        />
      </div>
      <div className="space-y-1.5">
        <Label>Quantidade de Questões da Meta</Label>
        <Input
          name="question_count"
          type="number"
          min={1}
          defaultValue={defaultValues?.question_count ?? 20}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-gold font-bold flex items-center gap-1.5">
          <ExternalLink className="h-4 w-4" /> Link do Filtro / Caderno de Questões
        </Label>
        <Input
          name="external_url"
          defaultValue={defaultValues?.external_url}
          placeholder="https://..."
        />
        <p className="text-[11px] text-muted-foreground">
          Cole a URL completa do seu caderno de questões ou filtro externo.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Dias de Liberação (após a matrícula)</Label>
        <Input
          name="release_offset_days"
          type="number"
          min={0}
          defaultValue={defaultValues?.release_offset_days ?? 0}
        />
      </div>
    </>
  );
}

function ExamFormFields({
  defaultValues,
  showFileUpload = true,
}: {
  defaultValues?: any;
  showFileUpload?: boolean;
}) {
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  return (
    <>
      <div className="space-y-1.5">
        <Label>Título do Simulado</Label>
        <Input
          name="title"
          defaultValue={defaultValues?.title}
          placeholder="Ex: Simulado 01 — Carreiras Policiais 60Q"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Descrição / Instruções</Label>
        <Textarea
          name="description"
          defaultValue={defaultValues?.description}
          placeholder="Instruções sobre o simulado..."
        />
      </div>

      {showFileUpload && (
        <div className="space-y-1.5 rounded-xl border border-gold/30 bg-gold/5 p-3.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Arquivo da Prova em PDF
          </Label>
          <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gold/50 bg-background p-3 text-xs font-bold text-gold cursor-pointer hover:bg-gold/10 transition-colors">
            <Upload className="h-4 w-4" />
            <span>
              {selectedFileName
                ? `PDF Selecionado: ${selectedFileName}`
                : "+ Clique aqui para Selecionar o Arquivo PDF"}
            </span>
            <input
              type="file"
              name="pdf_file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedFileName(file.name);
              }}
            />
          </label>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Ou informe um Link Externo (Forms / Plataforma)</Label>
        <Input
          name="external_url"
          defaultValue={defaultValues?.external_url}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1.5">
        <Label>Dias de Liberação (após a matrícula)</Label>
        <Input
          name="release_offset_days"
          type="number"
          min={0}
          defaultValue={defaultValues?.release_offset_days ?? 0}
        />
      </div>
    </>
  );
}

function LessonEditor({ lesson, onSaved }: { lesson: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const { data: materials = [] } = useQuery({
    queryKey: ["lesson-materials", lesson.id],
    queryFn: async () =>
      (await supabase.from("materials").select("*").eq("lesson_id", lesson.id).order("sort_order"))
        .data ?? [],
  });

  const save = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("lessons").update(form).eq("id", lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Aula atualizada!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Aula removida.");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const path = `${lesson.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("course-materials")
        .upload(path, file);
      if (uploadErr) throw uploadErr;
      const { error: dbErr } = await supabase.from("materials").insert({
        lesson_id: lesson.id,
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_path: path,
      });
      if (dbErr) throw dbErr;
      toast.success("PDF anexado à aula!");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Erro no envio do PDF.");
    } finally {
      setUploadingPdf(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3 hover:border-gold/30 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-foreground">{lesson.title}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {lesson.video_url ? "Vídeo configurado" : "Sem vídeo"}
          </div>
        </div>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-gold">
            <Edit3 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Aula</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save.mutate({
              title: String(f.get("title") || ""),
              description: String(f.get("description") || ""),
              video_url: String(f.get("video_url") || ""),
              release_offset_days: Number(f.get("release_offset_days") || 0),
            });
          }}
          className="space-y-4 mt-2"
        >
          <LessonFormFields defaultValues={lesson} />

          {/* PDF Materials Manager */}
          <div className="border-t border-border pt-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 mb-2">
              <FileText className="h-4 w-4" /> Materiais de Apoio (PDFs)
            </Label>
            <div className="space-y-2">
              {materials.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-2 text-xs"
                >
                  <span className="truncate flex-1 font-medium">{m.title}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive"
                    onClick={async () => {
                      await supabase.from("materials").delete().eq("id", m.id);
                      toast.success("PDF removido.");
                      onSaved();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gold/40 p-3 text-xs font-bold text-gold cursor-pointer hover:bg-gold/10 transition-colors">
                <Upload className="h-4 w-4" />
                <span>{uploadingPdf ? "Enviando PDF..." : "+ Anexar arquivo PDF"}</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingPdf}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="flex-1 bg-gradient-gold text-black font-extrabold shadow-glow"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalEditor({ goal, onSaved }: { goal: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const save = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("question_goals").update(form).eq("id", goal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Meta salva!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("question_goals").delete().eq("id", goal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Meta removida.");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3 hover:border-gold/30 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-foreground">{goal.title}</div>
          <div className="truncate text-[11px] text-gold font-semibold">
            {goal.external_url ? "Link configurado" : `${goal.question_count} questões`}
          </div>
        </div>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-gold">
            <Edit3 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Meta de Questões</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save.mutate({
              title: String(f.get("title") || ""),
              description: String(f.get("description") || ""),
              question_count: Number(f.get("question_count") || 0),
              external_url: String(f.get("external_url") || ""),
              release_offset_days: Number(f.get("release_offset_days") || 0),
            });
          }}
          className="space-y-4 mt-2"
        >
          <GoalFormFields defaultValues={goal} />
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="flex-1 bg-gradient-gold text-black font-extrabold shadow-glow"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExamEditor({ exam, onSaved }: { exam: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const save = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("mock_exams").update(form).eq("id", exam.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Simulado salvo!");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mock_exams").delete().eq("id", exam.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Simulado removido.");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  async function handleExamPdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const path = `simulados/${exam.id}_${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("course-materials")
        .upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: publicData } = supabase.storage.from("course-materials").getPublicUrl(path);
      const pdfUrl = publicData.publicUrl;
      await supabase.from("mock_exams").update({ external_url: pdfUrl }).eq("id", exam.id);
      toast.success("PDF do Simulado anexado com sucesso!");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Erro no envio do PDF.");
    } finally {
      setUploadingPdf(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-3 hover:border-gold/30 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold text-foreground">{exam.title}</div>
          <div className="truncate text-[11px] text-gold font-semibold">
            {exam.external_url ? "PDF / Link Configurado ✔" : "Sem arquivo"}
          </div>
        </div>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-gold">
            <Edit3 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Simulado</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save.mutate({
              title: String(f.get("title") || ""),
              description: String(f.get("description") || ""),
              external_url: String(f.get("external_url") || ""),
              release_offset_days: Number(f.get("release_offset_days") || 0),
            });
          }}
          className="space-y-4 mt-2"
        >
          <ExamFormFields defaultValues={exam} />

          {/* PDF Upload Button */}
          <div className="border-t border-border pt-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 mb-2">
              <FileText className="h-4 w-4" /> Enviar Prova do Simulado (Arquivo PDF)
            </Label>
            <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gold/40 p-3.5 text-xs font-bold text-gold cursor-pointer hover:bg-gold/10 transition-colors">
              <Upload className="h-4 w-4" />
              <span>
                {uploadingPdf ? "Enviando PDF do Simulado..." : "+ Selecionar Arquivo PDF"}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleExamPdfUpload}
                disabled={uploadingPdf}
                className="hidden"
              />
            </label>
            {exam.external_url && (
              <p className="mt-2 truncate text-[11px] text-muted-foreground">
                Link Atual: {exam.external_url}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Excluir
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="flex-1 bg-gradient-gold text-black font-extrabold shadow-glow"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
