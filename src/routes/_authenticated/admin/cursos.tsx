import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Edit3, Upload, Sparkles, Trash2, Plus, Check, X, FileText, Eye } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchFullCourse } from "@/lib/course-data";
import { generateQuestionsFromPdf, publishGoalQuestions } from "@/lib/questions.functions";
import { PdfViewer } from "@/components/pdf-viewer";

export const Route = createFileRoute("/_authenticated/admin/cursos")({
  head: () => ({ meta: [{ title: "Admin — Cursos" }, { name: "robots", content: "noindex" }] }),
  component: AdminCourses,
});

async function uploadToStorage(file: File, prefix: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("course-materials")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

function AdminCourses() {
  const { data: course } = useQuery({
    queryKey: ["course-full", "protocolo-4d"],
    queryFn: () => fetchFullCourse("protocolo-4d"),
  });
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["course-full", "protocolo-4d"] });

  if (!course) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
        <h2 className="font-display text-xl font-bold">{course.course.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{course.course.description}</p>
      </div>

      {course.cycles.map((cycle) => {
        const cLessons = course.lessons.filter((l) => l.cycle_id === cycle.id);
        const cGoals = course.goals.filter((g) => g.cycle_id === cycle.id);
        const cExams = course.exams.filter((e) => e.number === cycle.number);
        return (
          <div
            key={cycle.id}
            className="rounded-2xl border border-border bg-card p-6 shadow-elegant"
          >
            <h3 className="font-display text-lg font-bold text-gold">
              Ciclo {cycle.number} — {cycle.title}
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Videoaulas
                </h4>
                <div className="space-y-2">
                  {cLessons.map((l) => (
                    <LessonEditor key={l.id} lesson={l} onSaved={invalidate} />
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Metas
                </h4>
                <div className="space-y-2">
                  {cGoals.map((g) => (
                    <GoalEditor key={g.id} goal={g} onSaved={invalidate} />
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Simulados
                </h4>
                <div className="space-y-2">
                  {cExams.map((e) => (
                    <ExamEditor key={e.id} exam={e} onSaved={invalidate} />
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

function EditorCard({
  title,
  sub,
  children,
  wide,
}: {
  title: string;
  sub?: string;
  children: (close: () => void) => React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{title}</div>
          {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
        </div>
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost">
            <Edit3 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent className={wide ? "max-w-3xl max-h-[85vh] overflow-y-auto" : "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>Editar</DialogTitle>
        </DialogHeader>
        {open && children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

function LessonEditor({ lesson, onSaved }: { lesson: any; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("lessons").update(form).eq("id", lesson.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Salvo.");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const removeVideoFile = async () => {
    try {
      const { error } = await supabase
        .from("lessons")
        .update({ video_file_path: "" as any })
        .eq("id", lesson.id);
      if (error) throw error;
      onSaved();
      toast.success("Arquivo de vídeo removido.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao remover vídeo");
    }
  };

  return (
    <EditorCard
      title={lesson.title}
      sub={lesson.video_url || lesson.video_file_path || "sem vídeo"}
      wide
    >
      {() => (
        <Tabs defaultValue="info">
          <TabsList className="mb-4">
            <TabsTrigger value="info">Info & Vídeo</TabsTrigger>
            <TabsTrigger value="materials">Materiais (PDFs)</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save.mutate({
                  title: f.get("title"),
                  description: f.get("description"),
                  video_url: f.get("video_url"),
                  release_offset_days: Number(f.get("release_offset_days")),
                });
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input name="title" defaultValue={lesson.title} required />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea name="description" defaultValue={lesson.description} />
              </div>
              <div className="space-y-1.5">
                <Label>URL do vídeo (YouTube/Vimeo/Loom/Drive)</Label>
                <Input
                  name="video_url"
                  defaultValue={lesson.video_url}
                  placeholder="https://youtu.be/... ou https://vimeo.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Arquivo de vídeo enviado (Storage)</Label>
                <div className="flex gap-2">
                  <Input
                    value={lesson.video_file_path || ""}
                    readOnly
                    placeholder="Nenhum arquivo enviado"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const path = await uploadToStorage(file, `videos/${lesson.id}`);
                        await supabase
                          .from("lessons")
                          .update({ video_file_path: path })
                          .eq("id", lesson.id);
                        onSaved();
                        toast.success("Vídeo enviado.");
                      } catch (err: any) {
                        toast.error(err.message);
                      } finally {
                        setUploading(false);
                        if (fileRef.current) fileRef.current.value = "";
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                  {lesson.video_file_path && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={removeVideoFile}
                      title="Remover vídeo"
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Se preencher o arquivo, ele terá prioridade sobre a URL externa.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Liberação (dias após matrícula)</Label>
                <Input
                  name="release_offset_days"
                  type="number"
                  min={0}
                  defaultValue={lesson.release_offset_days}
                />
              </div>
              <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-primary">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="materials">
            <LessonMaterialsManager lessonId={lesson.id} />
          </TabsContent>
        </Tabs>
      )}
    </EditorCard>
  );
}

function LessonMaterialsManager({ lessonId }: { lessonId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const { data: materials, isLoading } = useQuery({
    queryKey: ["lesson-materials", lessonId],
    queryFn: async () => {
      const { data } = await supabase
        .from("materials")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("sort_order");
      return data ?? [];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["lesson-materials", lessonId] });

  const addMaterial = useMutation({
    mutationFn: async (filePath: string) => {
      const sortOrder = materials?.length ?? 0;
      const matTitle = title.trim() || "Material de Apoio (PDF)";
      const { error } = await supabase.from("materials").insert({
        lesson_id: lessonId,
        title: matTitle,
        file_path: filePath,
        sort_order: sortOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setTitle("");
      toast.success("Material PDF adicionado.");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao adicionar material"),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Material removido.");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover material"),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background/60 p-4 space-y-3">
        <h4 className="text-sm font-semibold">Adicionar Novo PDF à Aula</h4>
        <div className="space-y-2">
          <Label className="text-xs">Título do Material</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Apostila de Apoio - Módulo 1"
          />
        </div>
        <div className="flex gap-2 items-center">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const path = await uploadToStorage(file, `materials/${lessonId}`);
                await addMaterial.mutateAsync(path);
              } catch (err: any) {
                toast.error(err.message);
              } finally {
                setUploading(false);
                if (fileRef.current) fileRef.current.value = "";
              }
            }}
          />
          <Button
            type="button"
            className="bg-gradient-primary w-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || addMaterial.isPending}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Enviando PDF..." : "Selecionar & Enviar PDF"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Materiais Cadastrados ({materials?.length ?? 0})</h4>
        {isLoading ? (
          <div className="py-4 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : !materials || materials.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Nenhum material em PDF cadastrado para esta aula.
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((m: any) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/80 p-3"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 text-gold shrink-0" />
                  <span className="text-sm font-medium truncate">{m.title}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewPath(m.file_path)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMaterial.mutate(m.id)}
                    disabled={deleteMaterial.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!previewPath} onOpenChange={(v) => !v && setPreviewPath(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Visualizar PDF</DialogTitle>
          </DialogHeader>
          {previewPath && <PdfViewer filePath={previewPath} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalEditor({ goal, onSaved }: { goal: any; onSaved: () => void }) {
  const pdfRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generate = useServerFn(generateQuestionsFromPdf);
  const publish = useServerFn(publishGoalQuestions);

  const save = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("question_goals").update(form).eq("id", goal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Salvo.");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const gen = useMutation({
    mutationFn: async (count: number) => generate({ data: { goalId: goal.id, count } }),
    onSuccess: (r: any) => {
      toast.success(`${r.inserted} questões geradas — revise e publique.`);
      onSaved();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const pub = useMutation({
    mutationFn: async (publishAll: boolean) =>
      publish({ data: { goalId: goal.id, publish: publishAll } }),
    onSuccess: () => {
      toast.success("Publicação atualizada.");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <EditorCard
      title={goal.title}
      sub={`${goal.question_count} questões · ${goal.subject || "sem assunto"}`}
      wide
    >
      {() => (
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="ia">IA — Gerar</TabsTrigger>
            <TabsTrigger value="questions">Questões</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save.mutate({
                  title: f.get("title"),
                  subject: f.get("subject"),
                  description: f.get("description"),
                  external_url: f.get("external_url"),
                  release_offset_days: Number(f.get("release_offset_days")),
                });
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input name="title" defaultValue={goal.title} required />
              </div>
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input
                  name="subject"
                  defaultValue={goal.subject ?? ""}
                  placeholder="Ex: Hardware e Software"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea name="description" defaultValue={goal.description} />
              </div>
              <div className="space-y-1.5">
                <Label>Link externo (fallback)</Label>
                <Input
                  name="external_url"
                  defaultValue={goal.external_url}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Liberação (dias)</Label>
                <Input
                  name="release_offset_days"
                  type="number"
                  min={0}
                  defaultValue={goal.release_offset_days}
                />
              </div>
              <Button
                type="submit"
                disabled={save.isPending}
                className="w-full bg-gradient-primary"
              >
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="ia" className="space-y-3">
            <div className="rounded-lg border border-border bg-background/60 p-4">
              <Label>PDF-base (assunto da meta)</Label>
              <div className="mt-2 flex gap-2">
                <Input value={goal.pdf_path || ""} readOnly placeholder="Nenhum PDF enviado" />
                <input
                  ref={pdfRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const path = await uploadToStorage(file, `goal-pdfs/${goal.id}`);
                      await supabase
                        .from("question_goals")
                        .update({ pdf_path: path })
                        .eq("id", goal.id);
                      onSaved();
                      toast.success("PDF enviado.");
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setUploading(false);
                      if (pdfRef.current) pdfRef.current.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => pdfRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
                {goal.pdf_path && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await supabase
                          .from("question_goals")
                          .update({ pdf_path: "" as any })
                          .eq("id", goal.id);
                        onSaved();
                        toast.success("PDF da meta removido.");
                      } catch (err: any) {
                        toast.error(err.message);
                      }
                    }}
                    title="Remover PDF"
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" />
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background/60 p-4">
              <Label>Quantidade de questões a gerar</Label>
              <div className="mt-2 flex gap-2">
                <Input id={`count-${goal.id}`} type="number" min={1} max={30} defaultValue={10} />
                <Button
                  className="bg-gradient-primary shadow-glow"
                  onClick={() => {
                    const el = document.getElementById(`count-${goal.id}`) as HTMLInputElement;
                    const count = Math.max(1, Math.min(30, Number(el?.value) || 10));
                    gen.mutate(count);
                  }}
                  disabled={gen.isPending || !goal.pdf_path}
                >
                  {gen.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" /> Gerar com IA
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                A IA usa o PDF acima como base. Questões geradas ficam como rascunho até você
                publicar.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="questions">
            <QuestionsManager
              goalId={goal.id}
              onPublishAll={() => pub.mutate(true)}
              onUnpublishAll={() => pub.mutate(false)}
              publishing={pub.isPending}
            />
          </TabsContent>
        </Tabs>
      )}
    </EditorCard>
  );
}

function QuestionsManager({
  goalId,
  onPublishAll,
  onUnpublishAll,
  publishing,
}: {
  goalId: string;
  onPublishAll: () => void;
  onUnpublishAll: () => void;
  publishing: boolean;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", goalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("questions")
        .select(
          "id, statement, explanation, is_published, order_index, question_options(id, label, content, is_correct, order_index)",
        )
        .eq("goal_id", goalId)
        .order("order_index");
      return data ?? [];
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-questions", goalId] });

  const add = useMutation({
    mutationFn: async () => {
      const orderIndex = data?.length ?? 0;
      const { data: q, error } = await supabase
        .from("questions")
        .insert({
          goal_id: goalId,
          statement: "Nova questão",
          order_index: orderIndex,
          is_published: false,
        })
        .select("id")
        .single();
      if (error || !q) throw new Error(error?.message);
      const opts = ["A", "B", "C", "D", "E"].map((label, i) => ({
        question_id: q.id,
        label,
        content: "",
        is_correct: i === 0,
        order_index: i,
      }));
      await supabase.from("question_options").insert(opts);
    },
    onSuccess: () => invalidate(),
  });

  if (isLoading)
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => add.mutate()} disabled={add.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Nova questão
        </Button>
        <Button
          size="sm"
          className="bg-gradient-primary"
          onClick={onPublishAll}
          disabled={publishing || !data?.length}
        >
          <Check className="mr-1 h-4 w-4" /> Publicar todas
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onUnpublishAll}
          disabled={publishing || !data?.length}
        >
          <X className="mr-1 h-4 w-4" /> Despublicar todas
        </Button>
      </div>
      {(!data || data.length === 0) && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma questão. Gere pela aba "IA" ou adicione manualmente.
        </div>
      )}
      {data?.map((q: any, i: number) => (
        <QuestionEditor key={q.id} q={q} index={i} onChange={invalidate} />
      ))}
    </div>
  );
}

function QuestionEditor({ q, index, onChange }: { q: any; index: number; onChange: () => void }) {
  const [statement, setStatement] = useState(q.statement);
  const [explanation, setExplanation] = useState(q.explanation);
  const [opts, setOpts] = useState<any[]>(
    q.question_options.slice().sort((a: any, b: any) => a.order_index - b.order_index),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await supabase.from("questions").update({ statement, explanation }).eq("id", q.id);
      for (const o of opts) {
        await supabase
          .from("question_options")
          .update({ label: o.label, content: o.content, is_correct: o.is_correct })
          .eq("id", o.id);
      }
      toast.success("Questão salva.");
      onChange();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Excluir esta questão?")) return;
    await supabase.from("questions").delete().eq("id", q.id);
    onChange();
  }

  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Questão {index + 1}{" "}
          {q.is_published ? (
            <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-400">
              publicada
            </span>
          ) : (
            <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-amber-400">
              rascunho
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={remove}>
          <Trash2 className="h-4 w-4 text-rose-400" />
        </Button>
      </div>
      <Textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={3} />
      <div className="mt-3 space-y-2">
        {opts.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <Input
              value={o.label}
              onChange={(e) =>
                setOpts((prev) =>
                  prev.map((p, idx) => (idx === i ? { ...p, label: e.target.value } : p)),
                )
              }
              className="w-16"
            />
            <Input
              value={o.content}
              onChange={(e) =>
                setOpts((prev) =>
                  prev.map((p, idx) => (idx === i ? { ...p, content: e.target.value } : p)),
                )
              }
            />
            <label className="flex shrink-0 items-center gap-1 text-xs">
              <input
                type="radio"
                name={`correct-${q.id}`}
                checked={o.is_correct}
                onChange={() =>
                  setOpts((prev) => prev.map((p, idx) => ({ ...p, is_correct: idx === i })))
                }
              />{" "}
              correta
            </label>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        <Label className="text-xs">Explicação / comentário</Label>
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" className="bg-gradient-primary" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar questão"}
        </Button>
      </div>
    </div>
  );
}

function ExamEditor({ exam, onSaved }: { exam: any; onSaved: () => void }) {
  const pdfRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(false);

  const save = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("mock_exams").update(form).eq("id", exam.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Salvo.");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <EditorCard title={exam.title} sub={exam.pdf_path || exam.external_url || "sem arquivos"} wide>
      {() => (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            save.mutate({
              title: f.get("title"),
              description: f.get("description"),
              external_url: f.get("external_url"),
              correction_video_url: f.get("correction_video_url"),
              release_offset_days: Number(f.get("release_offset_days")),
            });
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input name="title" defaultValue={exam.title} required />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea name="description" defaultValue={exam.description} />
          </div>

          <div className="space-y-1.5">
            <Label>PDF do Simulado</Label>
            <div className="flex gap-2">
              <Input value={exam.pdf_path || ""} readOnly placeholder="Nenhum PDF enviado" />
              <input
                ref={pdfRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingPdf(true);
                  try {
                    const path = await uploadToStorage(file, `exams/${exam.id}/simulado`);
                    await supabase.from("mock_exams").update({ pdf_path: path }).eq("id", exam.id);
                    onSaved();
                    toast.success("PDF enviado.");
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setUploadingPdf(false);
                    if (pdfRef.current) pdfRef.current.value = "";
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => pdfRef.current?.click()}
                disabled={uploadingPdf}
              >
                {uploadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
              {exam.pdf_path && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await supabase.from("mock_exams").update({ pdf_path: "" as any }).eq("id", exam.id);
                      onSaved();
                      toast.success("PDF do simulado removido.");
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                  }}
                  title="Remover PDF do Simulado"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>PDF do Gabarito</Label>
            <div className="flex gap-2">
              <Input value={exam.answer_key_path || ""} readOnly placeholder="Nenhum PDF enviado" />
              <input
                ref={keyRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingKey(true);
                  try {
                    const path = await uploadToStorage(file, `exams/${exam.id}/gabarito`);
                    await supabase
                      .from("mock_exams")
                      .update({ answer_key_path: path })
                      .eq("id", exam.id);
                    onSaved();
                    toast.success("Gabarito enviado.");
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setUploadingKey(false);
                    if (keyRef.current) keyRef.current.value = "";
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => keyRef.current?.click()}
                disabled={uploadingKey}
              >
                {uploadingKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
              {exam.answer_key_path && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await supabase
                        .from("mock_exams")
                        .update({ answer_key_path: "" as any })
                        .eq("id", exam.id);
                      onSaved();
                      toast.success("PDF do gabarito removido.");
                    } catch (err: any) {
                      toast.error(err.message);
                    }
                  }}
                  title="Remover PDF do Gabarito"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Vídeo de correção (YouTube/Vimeo)</Label>
            <Input
              name="correction_video_url"
              defaultValue={exam.correction_video_url ?? ""}
              placeholder="https://youtu.be/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Link externo do simulado (opcional)</Label>
            <Input name="external_url" defaultValue={exam.external_url} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Liberação (dias)</Label>
            <Input
              name="release_offset_days"
              type="number"
              min={0}
              defaultValue={exam.release_offset_days}
            />
          </div>
          <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-primary">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </form>
      )}
    </EditorCard>
  );
}
