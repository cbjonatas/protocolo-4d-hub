import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search,
  UserCheck,
  Eye,
  BookOpen,
  CheckCircle2,
  Phone,
  Sparkles,
  UserPlus,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/alunos")({
  head: () => ({
    meta: [{ title: "Admin — Gestão de Alunos" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminStudents,
  errorComponent: ({ reset }) => (
    <div className="rounded-2xl tactical-card p-8 text-center space-y-4">
      <h3 className="font-display text-lg font-bold text-gold">Gestão de Alunos</h3>
      <p className="text-xs text-muted-foreground">
        Não foi possível carregar a lista de alunos no momento.
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

function AdminStudents() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["admin-students-full"],
    queryFn: async () => {
      try {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        const [enrollmentsRes, rolesRes, lessonProgRes, goalProgRes, examProgRes] =
          await Promise.all([
            supabase.from("enrollments").select("*"),
            supabase.from("user_roles").select("*"),
            supabase.from("lesson_progress").select("*"),
            supabase.from("goal_progress").select("*"),
            supabase.from("exam_progress").select("*"),
          ]);

        const enrollments = enrollmentsRes?.data ?? [];
        const roles = rolesRes?.data ?? [];
        const lessonProg = lessonProgRes?.data ?? [];
        const goalProg = goalProgRes?.data ?? [];
        const examProg = examProgRes?.data ?? [];

        let localStudents: any[] = [];
        try {
          const raw = localStorage.getItem("p4d_all_registered_students");
          if (raw) localStudents = JSON.parse(raw);
        } catch {}

        const allMap = new Map<string, any>();

        // 1. Add students from local persistent registry
        for (const s of localStudents) {
          if (s && s.id && s.email) {
            allMap.set(s.id, {
              ...s,
              enrollments: enrollments.filter((e: any) => e.user_id === s.id),
              lessonsCompleted: lessonProg.filter((lp: any) => lp.user_id === s.id).length,
              goalsCompleted: goalProg.filter((gp: any) => gp.user_id === s.id).length,
              examsCompleted: examProg.filter((ep: any) => ep.user_id === s.id).length,
            });
          }
        }

        // 2. Add/override from Supabase profiles
        for (const p of profiles ?? []) {
          const userEnrollments = enrollments.filter((e: any) => e.user_id === p.id);
          const lDone = lessonProg.filter((lp: any) => lp.user_id === p.id).length;
          const gDone = goalProg.filter((gp: any) => gp.user_id === p.id).length;
          const eDone = examProg.filter((ep: any) => ep.user_id === p.id).length;

          allMap.set(p.id, {
            ...p,
            enrollments: userEnrollments,
            lessonsCompleted: lDone,
            goalsCompleted: gDone,
            examsCompleted: eDone,
          });
        }

        // 3. Synthesize any missing profiles found in enrollments or student roles
        const studentUserIds = new Set([
          ...enrollments.map((e: any) => e.user_id),
          ...roles.filter((r: any) => r.role === "student").map((r: any) => r.user_id),
        ]);

        for (const uid of studentUserIds) {
          if (!allMap.has(uid)) {
            allMap.set(uid, {
              id: uid,
              full_name: "Aluno Cadastrado",
              email: `aluno_${uid.slice(0, 8)}@plataforma.com`,
              whatsapp: "Não cadastrado",
              created_at: new Date().toISOString(),
              enrollments: enrollments.filter((e: any) => e.user_id === uid),
              lessonsCompleted: lessonProg.filter((lp: any) => lp.user_id === uid).length,
              goalsCompleted: goalProg.filter((gp: any) => gp.user_id === uid).length,
              examsCompleted: examProg.filter((ep: any) => ep.user_id === uid).length,
            });
          }
        }

        // 4. Exclude admin accounts
        const finalStudents = Array.from(allMap.values()).filter((s: any) => {
          const email = s.email?.toLowerCase() ?? "";
          const name = s.full_name?.toLowerCase() ?? "";
          return (
            !email.includes("admin") && !email.startsWith("jhon") && !name.includes("administrador")
          );
        });

        return finalStudents;
      } catch (err) {
        console.error("Erro ao carregar alunos:", err);
        return [];
      }
    },
    retry: 1,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["admin-courses-list"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("courses").select("*").eq("is_active", true);
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    retry: 1,
  });

  const filtered = students.filter((s: any) => {
    const q = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.whatsapp?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card shadow-elegant">
        <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold text-gold uppercase tracking-widest">
              PAINEL DE CONTROLE DE ALUNOS
            </div>
            <h2 className="font-display text-xl font-bold flex items-center gap-2 mt-1">
              <UserCheck className="h-5 w-5 text-gold" /> Alunos Cadastrados na Plataforma
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total: {students.length} alunos | Filtro: {filtered.length}
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/80"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground font-display">
            Carregando dados dos alunos...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Aluno / E-mail</th>
                  <th className="px-5 py-3.5">WhatsApp</th>
                  <th className="px-5 py-3.5">Cadastro</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Progresso de Estudos</th>
                  <th className="px-5 py-3.5 text-center">Matrículas</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                      {search
                        ? `Nenhum aluno encontrado para a busca "${search}".`
                        : "Nenhum aluno cadastrado no momento. Os novos alunos cadastrados na plataforma aparecerão nesta lista automaticamente."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((student: any) => (
                    <StudentRow
                      key={student.id}
                      student={student}
                      courses={courses}
                      onUpdated={() => qc.invalidateQueries({ queryKey: ["admin-students-full"] })}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentRow({
  student,
  courses,
  onUpdated,
}: {
  student: any;
  courses: any[];
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const cleanPhone = student.whatsapp?.replace(/\D/g, "");
  const createdDate = student.created_at
    ? new Date(student.created_at).toLocaleDateString("pt-BR")
    : "Hoje";

  const toggleEnrollment = useMutation({
    mutationFn: async ({ courseId, isEnrolled }: { courseId: string; isEnrolled: boolean }) => {
      if (isEnrolled) {
        await supabase
          .from("enrollments")
          .delete()
          .eq("user_id", student.id)
          .eq("course_id", courseId);
      } else {
        await supabase.from("enrollments").insert({ user_id: student.id, course_id: courseId });
      }
    },
    onSuccess: () => {
      toast.success("Matrícula atualizada!");
      onUpdated();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar matrícula."),
  });

  return (
    <tr className="border-t border-border hover:bg-accent/30 transition-colors">
      <td className="px-5 py-4">
        <div className="font-bold text-foreground">{student.full_name || "Aluno sem Nome"}</div>
        <div className="text-xs text-muted-foreground">{student.email}</div>
      </td>
      <td className="px-5 py-4">
        {cleanPhone ? (
          <a
            href={`https://wa.me/55${cleanPhone}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline"
          >
            <Phone className="h-3.5 w-3.5" /> {student.whatsapp}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{student.whatsapp || "—"}</span>
        )}
      </td>
      <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">{createdDate}</td>
      <td className="px-5 py-4 text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
          ● Ativo
        </span>
      </td>
      <td className="px-5 py-4 text-center">
        <div className="inline-flex items-center gap-3 rounded-lg border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold">
          <span>{student.lessonsCompleted ?? 0} Aulas</span>
          <span>•</span>
          <span>{student.goalsCompleted ?? 0} Metas</span>
          <span>•</span>
          <span>{student.examsCompleted ?? 0} Simulados</span>
        </div>
      </td>
      <td className="px-5 py-4 text-center">
        <span className="rounded-md bg-accent px-2.5 py-1 text-xs font-bold text-foreground">
          {student.enrollments.length} curso(s)
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-gold/40 text-gold font-bold hover:bg-gold/10"
            >
              <Eye className="mr-1.5 h-4 w-4" /> Detalhes & Matrículas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                Gestão do Aluno: {student.full_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-xs">
                <div>
                  <strong className="text-gold">E-mail:</strong> {student.email}
                </div>
                <div>
                  <strong className="text-gold">WhatsApp:</strong>{" "}
                  {student.whatsapp || "Não cadastrado"}
                </div>
                <div>
                  <strong className="text-gold">Data de Cadastro:</strong>{" "}
                  {new Date(student.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>

              {/* Progress Summary Card */}
              <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
                <div className="text-xs font-extrabold uppercase tracking-widest text-gold mb-2">
                  PROGRESSO INDIVIDUAL
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-background/80 rounded-lg p-2 border border-border">
                    <div className="font-display text-xl font-bold text-gold">
                      {student.lessonsCompleted}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase">
                      Aulas Concluídas
                    </div>
                  </div>
                  <div className="bg-background/80 rounded-lg p-2 border border-border">
                    <div className="font-display text-xl font-bold text-gold">
                      {student.goalsCompleted}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase">
                      Metas de Questões
                    </div>
                  </div>
                  <div className="bg-background/80 rounded-lg p-2 border border-border">
                    <div className="font-display text-xl font-bold text-gold">
                      {student.examsCompleted}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase">
                      Simulados Feitos
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Enrollment Toggle */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5 mb-2">
                  <BookOpen className="h-4 w-4" /> Gestão de Matrículas em Cursos
                </Label>
                <div className="space-y-2">
                  {courses.map((c: any) => {
                    const enrolled = student.enrollments.some((e: any) => e.course_id === c.id);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-background p-3"
                      >
                        <div>
                          <div className="font-bold text-xs">{c.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {enrolled ? "Matriculado" : "Não matriculado"}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={enrolled ? "destructive" : "default"}
                          disabled={toggleEnrollment.isPending}
                          onClick={() =>
                            toggleEnrollment.mutate({ courseId: c.id, isEnrolled: enrolled })
                          }
                          className={
                            enrolled
                              ? "h-8 text-xs font-bold"
                              : "h-8 text-xs font-extrabold bg-gradient-gold text-black shadow-glow"
                          }
                        >
                          {enrolled ? "Cancelar Matrícula" : "+ Matricular Aluno"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  );
}
