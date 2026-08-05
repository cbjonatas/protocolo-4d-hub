import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  adminToggleEnrollment,
  adminDeleteStudent,
  adminSetStudentPassword,
  adminSetStudentBlocked,
} from "@/lib/admin-students.functions";
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
  Lock,
  Key,
  Trophy,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getRegisteredStudents,
  saveRegisteredStudent,
  updateStudentStatus,
  updateStudentPassword,
  clearAllRegisteredStudents,
  toggleStudentEnrollmentLocal,
} from "@/lib/user-registry";
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

function computeStudentProtocolsSummary(
  userId: string,
  courses: any[],
  cycles: any[],
  lessons: any[],
  goals: any[],
  exams: any[],
  lessonProg: any[],
  goalProg: any[],
  examProg: any[]
) {
  const userLessons = new Set(lessonProg.filter((lp) => lp.user_id === userId).map((lp) => lp.lesson_id));
  const userGoals = new Set(goalProg.filter((gp) => gp.user_id === userId).map((gp) => gp.goal_id));
  const userExams = new Set(examProg.filter((ep) => ep.user_id === userId).map((ep) => ep.exam_id));

  let completedCount = 0;
  let inProgressCount = 0;

  const defaultMonths = [
    { id: "protocolo-agosto", slug: "protocolo-4d", title: "Protocolo 4D — Agosto" },
    { id: "protocolo-setembro", slug: "protocolo-4d-setembro", title: "Protocolo 4D — Setembro" },
    { id: "protocolo-outubro", slug: "protocolo-4d-outubro", title: "Protocolo 4D — Outubro" },
  ];

  const allCourses = courses.length > 0 ? courses : defaultMonths;

  const monthlyDetails = allCourses.map((course) => {
    const courseCycleIds = new Set(cycles.filter((c) => c.course_id === course.id).map((c) => c.id));
    const cLessons = lessons.filter((l) => courseCycleIds.has(l.cycle_id));
    const cGoals = goals.filter((g) => courseCycleIds.has(g.cycle_id));
    const cExams = exams.filter((e) => e.course_id === course.id);

    const total = (cLessons.length || 4) + (cGoals.length || 4) + (cExams.length || 4);
    const done =
      cLessons.filter((l) => userLessons.has(l.id)).length +
      cGoals.filter((g) => userGoals.has(g.id)).length +
      cExams.filter((e) => userExams.has(e.id)).length;

    const percent = total ? Math.round((done / total) * 100) : 0;
    if (percent === 100 && total > 0) completedCount++;
    else if (done > 0) inProgressCount++;

    return {
      title: course.title,
      slug: course.slug,
      done,
      total,
      percent,
      isCompleted: percent === 100 && total > 0,
      hasStarted: done > 0,
    };
  });

  return {
    totalCourses: allCourses.length,
    completedCount,
    inProgressCount,
    monthlyDetails,
  };
}

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

        const [
          coursesRes,
          cyclesRes,
          lessonsRes,
          goalsRes,
          examsRes,
          enrollmentsRes,
          rolesRes,
          lessonProgRes,
          goalProgRes,
          examProgRes,
        ] = await Promise.all([
          supabase.from("courses").select("*"),
          supabase.from("cycles").select("*"),
          supabase.from("lessons").select("*"),
          supabase.from("question_goals").select("*"),
          supabase.from("mock_exams").select("*"),
          supabase.from("enrollments").select("*"),
          supabase.from("user_roles").select("*"),
          supabase.from("lesson_progress").select("*"),
          supabase.from("goal_progress").select("*"),
          supabase.from("exam_progress").select("*"),
        ]);

        const dbCourses = coursesRes?.data ?? [];
        const dbCycles = cyclesRes?.data ?? [];
        const dbLessons = lessonsRes?.data ?? [];
        const dbGoals = goalsRes?.data ?? [];
        const dbExams = examsRes?.data ?? [];
        const enrollments = enrollmentsRes?.data ?? [];
        const lessonProg = lessonProgRes?.data ?? [];
        const goalProg = goalProgRes?.data ?? [];
        const examProg = examProgRes?.data ?? [];

        const localStudents = getRegisteredStudents();
        const allMap = new Map<string, any>();

        // 1. Add students from local persistent registry
        for (const s of localStudents) {
          if (s && s.id && s.email) {
            const summary = computeStudentProtocolsSummary(
              s.id,
              dbCourses,
              dbCycles,
              dbLessons,
              dbGoals,
              dbExams,
              lessonProg,
              goalProg,
              examProg
            );

            allMap.set(s.id, {
              ...s,
              enrollments: enrollments.filter((e: any) => e.user_id === s.id),
              lessonsCompleted: lessonProg.filter((lp: any) => lp.user_id === s.id).length,
              goalsCompleted: goalProg.filter((gp: any) => gp.user_id === s.id).length,
              examsCompleted: examProg.filter((ep: any) => ep.user_id === s.id).length,
              protocolsSummary: summary,
            });
          }
        }

        // 2. Add/override from Supabase profiles if not admin/synthetic
        for (const p of profiles ?? []) {
          const email = p.email?.toLowerCase() ?? "";
          const name = p.full_name?.toLowerCase() ?? "";
          if (
            !email.includes("admin") &&
            !email.startsWith("jhon") &&
            !name.includes("administrador") &&
            !email.startsWith("aluno_") &&
            !email.includes("teste")
          ) {
            const userEnrollments = enrollments.filter((e: any) => e.user_id === p.id);
            const lDone = lessonProg.filter((lp: any) => lp.user_id === p.id).length;
            const gDone = goalProg.filter((gp: any) => gp.user_id === p.id).length;
            const eDone = examProg.filter((ep: any) => ep.user_id === p.id).length;

            const summary = computeStudentProtocolsSummary(
              p.id,
              dbCourses,
              dbCycles,
              dbLessons,
              dbGoals,
              dbExams,
              lessonProg,
              goalProg,
              examProg
            );

            allMap.set(p.id, {
              ...p,
              enrollments: userEnrollments,
              lessonsCompleted: lDone,
              goalsCompleted: gDone,
              examsCompleted: eDone,
              protocolsSummary: summary,
            });
          }
        }

        // 3. Exclude admin accounts and synthetic test users
        const finalStudents = Array.from(allMap.values()).filter((s: any) => {
          const email = s.email?.toLowerCase() ?? "";
          const name = s.full_name?.toLowerCase() ?? "";
          return (
            !email.includes("admin") &&
            !email.startsWith("jhon") &&
            !name.includes("administrador") &&
            !(email.startsWith("aluno_") && email.endsWith("@plataforma.com")) &&
            !email.includes("teste")
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
    queryKey: ["admin-courses-list-full"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("courses")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        const DEFAULT_MONTHS = [
          { id: "protocolo-agosto", slug: "protocolo-4d", title: "Protocolo 4D — Agosto", is_active: true, sort_order: 1 },
          { id: "protocolo-setembro", slug: "protocolo-4d-setembro", title: "Protocolo 4D — Setembro", is_active: false, sort_order: 2 },
          { id: "protocolo-outubro", slug: "protocolo-4d-outubro", title: "Protocolo 4D — Outubro", is_active: false, sort_order: 3 },
        ];

        const map = new Map<string, any>();
        for (const d of DEFAULT_MONTHS) {
          map.set(d.slug, d);
        }
        for (const c of data ?? []) {
          if (c.slug === "protocolo-4d" && (c.title === "Protocolo 4D" || c.title === "PROTOCOLO 4D")) {
            map.set(c.slug, { ...c, title: "Protocolo 4D — Agosto" });
          } else {
            map.set(c.slug, c);
          }
        }
        return Array.from(map.values());
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

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/80"
              />
            </div>
            <AddStudentDialog onAdded={() => qc.invalidateQueries({ queryKey: ["admin-students-full"] })} />
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

function AddStudentDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !email) {
      toast.error("Preencha o nome e e-mail do aluno.");
      return;
    }

    setLoading(true);
    try {
      const studentId = crypto.randomUUID();
      const newStudent = {
        id: studentId,
        full_name: fullName,
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_blocked: false,
      };

      // 1. Insert profile in Supabase DB
      await supabase.from("profiles").upsert(newStudent, { onConflict: "id" });

      // 2. Save in local registry
      saveRegisteredStudent(newStudent);

      toast.success(`Aluno ${fullName} cadastrado com sucesso no Painel Admin!`);
      setFullName("");
      setEmail("");
      setWhatsapp("");
      setOpen(false);
      onAdded();
    } catch (err: any) {
      toast.error("Erro ao cadastrar aluno: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-gold text-black font-extrabold text-xs uppercase tracking-wider shadow-glow h-10 px-4 shrink-0">
          <UserPlus className="mr-1.5 h-4 w-4" /> Cadastrar Aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-gold" /> Cadastrar Novo Aluno
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome Completo do Aluno</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: João da Silva"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail do Aluno</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@exemplo.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp (Opcional)</Label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-gold text-black font-bold">
              {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Salvar Aluno
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
  const [newPassword, setNewPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const qc = useQueryClient();
  const toggleEnrollmentFn = useServerFn(adminToggleEnrollment);
  const deleteStudentFn = useServerFn(adminDeleteStudent);
  const setPasswordFn = useServerFn(adminSetStudentPassword);
  const setBlockedFn = useServerFn(adminSetStudentBlocked);

  const cleanPhone = student.whatsapp?.replace(/\D/g, "");
  const createdDate = student.created_at
    ? new Date(student.created_at).toLocaleDateString("pt-BR")
    : "Hoje";

  const toggleEnrollment = useMutation({
    mutationFn: async ({
      courseId,
      isEnrolled,
      courseTitle,
    }: {
      courseId: string;
      isEnrolled: boolean;
      courseTitle?: string;
    }) => {
      const isUuid = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || "");

      // 1. Unblock student if enrolling and currently blocked
      if (!isEnrolled && student.is_blocked) {
        updateStudentStatus(student.id || student.email, false);
      }

      // 2. Resolve student real profile UUID in Supabase by email
      let targetUserId = "";
      if (student.email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", student.email.trim().toLowerCase())
          .maybeSingle();

        if (profile?.id && isUuid(profile.id)) {
          targetUserId = profile.id;
        }
      }

      if (!targetUserId || !isUuid(targetUserId)) {
        throw new Error(
          `O aluno "${student.full_name || student.email}" ainda não possui uma conta de usuário ativa no banco de dados. Peça para o aluno se cadastrar na plataforma.`
        );
      }

      // 3. Resolve course UUID from database
      const slugMap: Record<string, { slug: string; title: string }> = {
        "protocolo-agosto": { slug: "protocolo-4d", title: "Protocolo 4D — Agosto" },
        "protocolo-setembro": { slug: "protocolo-4d-setembro", title: "Protocolo 4D — Setembro" },
        "protocolo-outubro": { slug: "protocolo-4d-outubro", title: "Protocolo 4D — Outubro" },
        "protocolo-4d": { slug: "protocolo-4d", title: "Protocolo 4D — Agosto" },
        "protocolo-4d-setembro": { slug: "protocolo-4d-setembro", title: "Protocolo 4D — Setembro" },
        "protocolo-4d-outubro": { slug: "protocolo-4d-outubro", title: "Protocolo 4D — Outubro" },
      };

      const info = slugMap[courseId] || { slug: courseId, title: courseTitle || "Protocolo 4D" };
      let targetCourseId = courseId;

      if (!isUuid(courseId)) {
        const { data: dbCourse } = await supabase
          .from("courses")
          .select("id")
          .eq("slug", info.slug)
          .maybeSingle();

        if (dbCourse?.id) {
          targetCourseId = dbCourse.id;
        } else {
          // Attempt to create course if not seeded
          const { data: createdCourse, error: createErr } = await supabase
            .from("courses")
            .upsert(
              {
                slug: info.slug,
                title: info.title,
                description: "Protocolo estratégico de preparação em Informática.",
                is_active: true,
              },
              { onConflict: "slug" }
            )
            .select("id")
            .single();

          if (createErr) throw new Error("Erro ao identificar o curso no banco: " + createErr.message);
          targetCourseId = createdCourse.id;
        }
      }

      // 4. Perform Enrollment via direct DB interaction (Admin RLS policies handle security)
      if (isEnrolled) {
        const { error: delError } = await supabase
          .from("enrollments")
          .delete()
          .eq("user_id", targetUserId)
          .eq("course_id", targetCourseId);

        if (delError) throw new Error("Erro ao remover matrícula: " + delError.message);
      } else {
        const { error: insError } = await supabase.from("enrollments").insert({
          user_id: targetUserId,
          course_id: targetCourseId,
        });

        if (insError) {
          throw new Error("Erro ao salvar matrícula no banco: " + insError.message);
        }
      }
    },
    onSuccess: (_, variables) => {
      if (variables.isEnrolled) {
        toast.success("Matrícula removida.");
      } else {
        toast.success(
          `Matrícula realizada e acesso liberado com sucesso para ${variables.courseTitle ?? "o curso"}!`
        );
      }
      qc.invalidateQueries({ queryKey: ["admin-students-full"] });
      qc.invalidateQueries({ queryKey: ["admin-courses-list-full"] });
      qc.invalidateQueries({ queryKey: ["my-courses"] });
      qc.invalidateQueries({ queryKey: ["course-full"] });
      onUpdated();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar matrícula."),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async () => {
      // 1. Delete student data across all tables in Supabase DB via RPC (Bypass RLS)
      const { data, error } = await supabase.rpc("admin_delete_student", {
        p_user_id: student.id,
        p_email: student.email,
      });

      if (error) {
        throw new Error("Erro RPC ao excluir aluno: " + error.message);
      }
      const resObj = data as any;
      if (resObj && resObj.success === false) {
        throw new Error("Erro interno ao excluir aluno: " + (resObj.error || "Desconhecido"));
      }

      // 2. Delete from localStorage
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("p4d_all_registered_students");
        if (raw) {
          const list = JSON.parse(raw).filter(
            (s: any) => s.id !== student.id && s.email?.toLowerCase() !== student.email?.toLowerCase()
          );
          localStorage.setItem("p4d_all_registered_students", JSON.stringify(list));
        }
      }
    },
    onSuccess: () => {
      toast.success(`Aluno ${student.full_name || student.email} removido da base com sucesso!`);
      qc.invalidateQueries({ queryKey: ["admin-students-full"] });
      setOpen(false);
      onUpdated();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover aluno."),
  });

  async function handleToggleBlock() {
    const nextStatus = !student.is_blocked;
    updateStudentStatus(student.id || student.email, nextStatus);
    try {
      await setBlockedFn({ data: { userId: student.id, blocked: nextStatus } });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar status do aluno.");
      return;
    }
    toast.success(
      nextStatus
        ? `Acesso do aluno ${student.full_name} bloqueado!`
        : `Acesso do aluno ${student.full_name} liberado com sucesso!`
    );
    onUpdated();
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setChangingPass(true);
    try {
      await setPasswordFn({ data: { userId: student.id, password: newPassword } });
      updateStudentPassword(student.id || student.email, newPassword);
      toast.success(
        `Senha do aluno ${student.full_name} alterada com sucesso! Ele já pode entrar com a nova senha.`
      );
      setNewPassword("");
      onUpdated();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar a senha do aluno.");
    } finally {
      setChangingPass(false);
    }
  }

  return (
    <tr className="border-t border-border/60 hover:bg-accent/20 transition-colors">
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline"
          >
            <Phone className="h-3.5 w-3.5" /> {student.whatsapp}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{student.whatsapp || "—"}</span>
        )}
      </td>
      <td className="px-5 py-4 text-xs font-medium text-muted-foreground">{createdDate}</td>
      <td className="px-5 py-4 text-center">
        {student.is_blocked ? (
          <span className="text-xs font-bold text-destructive">● Bloqueado</span>
        ) : (
          <span className="text-xs font-bold text-emerald-400">● Ativo</span>
        )}
      </td>
      <td className="px-5 py-4 text-center">
        <div className="text-xs text-muted-foreground font-medium">
          <strong className="text-foreground">{student.lessonsCompleted ?? 0}</strong> Aulas ·{" "}
          <strong className="text-foreground">{student.goalsCompleted ?? 0}</strong> Metas ·{" "}
          <strong className="text-foreground">{student.examsCompleted ?? 0}</strong> Simulados
        </div>
      </td>
      <td className="px-5 py-4 text-center">
        <div className="text-xs font-semibold text-foreground">
          {student.enrollments.length} protocolo(s)
        </div>
      </td>
      <td className="px-5 py-4 text-right">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-gold/40 text-gold font-bold hover:bg-gold/10"
            >
              <Eye className="mr-1.5 h-4 w-4" /> Detalhes & Ações
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
                <div>
                  <strong className="text-gold">Status de Acesso:</strong>{" "}
                  <span className={student.is_blocked ? "text-destructive font-bold" : "text-emerald-400 font-bold"}>
                    {student.is_blocked ? "Bloqueado" : "Ativo / Liberado"}
                  </span>
                </div>
              </div>

              {/* Account Controls Card: Block/Unblock, Password & Delete */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-4 w-4" /> Ações de Conta & Segurança
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    variant={student.is_blocked ? "default" : "destructive"}
                    onClick={handleToggleBlock}
                    className={
                      student.is_blocked
                        ? "flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        : "flex-1 text-xs font-bold"
                    }
                  >
                    {student.is_blocked ? (
                      <>
                        <UserCheck className="mr-1.5 h-4 w-4" /> Liberar Acesso
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="mr-1.5 h-4 w-4" /> Bloquear Acesso
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (
                        window.confirm(
                          `ATENÇÃO: Deseja realmente EXCLUIR PERMANENTEMENTE o aluno "${student.full_name || student.email}" da base de dados?`
                        )
                      ) {
                        deleteStudentMutation.mutate();
                      }
                    }}
                    disabled={deleteStudentMutation.isPending}
                    className="border-destructive/60 text-destructive hover:bg-destructive/15 text-xs font-bold"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Excluir Aluno
                  </Button>
                </div>

                <form onSubmit={handleSavePassword} className="pt-2 border-t border-border/60 space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-gold" /> Alterar Senha do Aluno
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Digite a nova senha (min. 6 carac.)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-background text-xs"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={changingPass || !newPassword || newPassword.length < 6}
                      className="bg-gradient-gold text-black font-extrabold text-xs whitespace-nowrap"
                    >
                      Salvar Senha
                    </Button>
                  </div>
                </form>
              </div>

              {/* Monthly Protocol Enrollment & Selection Card */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-gold" /> Matricular em Protocolo Mensal
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Participando de <strong className="text-foreground">{student.enrollments.length}</strong> protocolo(s)
                  </span>
                </div>

                {/* Dropdown Box: Selecting automatically enrolls & unblocks */}
                <div className="pt-1 pb-2 border-b border-border/60">
                  <select
                    value=""
                    disabled={toggleEnrollment.isPending}
                    onChange={(e) => {
                      const cId = e.target.value;
                      if (!cId) return;
                      const matchingCourse = courses.find((c: any) => c.id === cId || c.slug === cId);
                      const courseTitle = matchingCourse?.title || "Protocolo";
                      // BUG 2 FIX: comparar course_id tanto com o ID real (UUID do banco)
                      // quanto com o slug sintético e o slug do course, para evitar
                      // falsos negativos quando o banco armazena UUID real.
                      const isEnrolled = student.enrollments.some(
                        (en: any) =>
                          en.course_id === cId ||
                          en.course_id === matchingCourse?.id ||
                          en.course_id === matchingCourse?.slug
                      );
                      toggleEnrollment.mutate({ courseId: cId, isEnrolled, courseTitle });
                    }}
                    className={`w-full rounded-xl border border-gold/40 bg-background px-3.5 py-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-gold transition-opacity ${
                      toggleEnrollment.isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <option value="" disabled>
                      {toggleEnrollment.isPending
                        ? "⏳ Processando matrícula..."
                        : "➕ Clique para selecionar o mês e matricular o aluno..."}
                    </option>
                    {courses.map((c: any) => {
                      const enrolled = student.enrollments.some(
                        (e: any) => e.course_id === c.id || e.course_id === c.slug
                      );
                      return (
                        <option key={c.id || c.slug} value={c.id || c.slug}>
                          {c.title} {enrolled ? "✓ (Já Matriculado)" : "➔ (Clique para Matricular e Liberar Acesso)"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Explicit List of Protocol Names with Status & Progress */}
                <div className="space-y-2 pt-1">
                  {student.protocolsSummary?.monthlyDetails.map((m: any) => {
                    const matchingCourse = courses.find(
                      (c: any) => c.slug === m.slug || c.title === m.title
                    );
                    const courseId = matchingCourse?.id || m.slug;
                    // BUG 2 FIX: checar UUID real, ID sintético E slug para detectar
                    // corretamente matrículas de setembro/outros meses com IDs variados.
                    const isEnrolled = student.enrollments.some(
                      (e: any) =>
                        e.course_id === matchingCourse?.id ||
                        e.course_id === m.slug ||
                        e.course_id === courseId
                    );

                    return (
                      <div
                        key={m.slug}
                        className="flex items-center justify-between rounded-lg border border-border/80 bg-background/80 p-3"
                      >
                        <div>
                          <div className="font-bold text-xs text-foreground">{m.title}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span
                              className={
                                isEnrolled ? "text-emerald-400 font-semibold" : "text-muted-foreground"
                              }
                            >
                              {isEnrolled ? "✓ Matriculado" : "○ Não Matriculado"}
                            </span>
                            <span>•</span>
                            <span>
                              {m.done} de {m.total} itens ({m.percent}%)
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant={isEnrolled ? "outline" : "default"}
                          disabled={toggleEnrollment.isPending}
                          onClick={() =>
                            toggleEnrollment.mutate({
                              courseId,
                              isEnrolled,
                              courseTitle: m.title,
                            })
                          }
                          className={
                            isEnrolled
                              ? "h-8 text-xs font-bold border-destructive/40 text-destructive hover:bg-destructive/10"
                              : "h-8 text-xs font-extrabold bg-gold text-black hover:bg-gold-light"
                          }
                        >
                          {isEnrolled ? "Remover" : "Matricular"}
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
