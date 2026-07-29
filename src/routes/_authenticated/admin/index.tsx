import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, Trophy, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Painel" }, { name: "robots", content: "noindex" }] }),
  component: AdminHome,
});

async function fetchStats() {
  try {
    const [profilesRes, coursesRes, enrollmentsRes, lessonsCountRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("enrollments").select("user_id, course_id"),
      supabase.from("lessons").select("id", { count: "exact", head: true }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const profiles = profilesRes.data ?? [];
    const enrollments = enrollmentsRes.data ?? [];
    const roles = rolesRes.data ?? [];

    let localStudents: any[] = [];
    try {
      const raw = localStorage.getItem("p4d_all_registered_students");
      if (raw) localStudents = JSON.parse(raw);
    } catch {}

    // Filter out admin users
    const studentUserIds = new Set<string>();
    for (const s of localStudents) {
      if (s && s.id) {
        const email = s.email?.toLowerCase() ?? "";
        const name = s.full_name?.toLowerCase() ?? "";
        if (
          !email.includes("admin") &&
          !email.startsWith("jhon") &&
          !name.includes("administrador")
        ) {
          studentUserIds.add(s.id);
        }
      }
    }
    for (const p of profiles) {
      const email = p.email?.toLowerCase() ?? "";
      const name = p.full_name?.toLowerCase() ?? "";
      if (
        !email.includes("admin") &&
        !email.startsWith("jhon") &&
        !name.includes("administrador")
      ) {
        studentUserIds.add(p.id);
      }
    }
    for (const e of enrollments) {
      studentUserIds.add(e.user_id);
    }
    for (const r of roles) {
      if (r.role === "student") {
        studentUserIds.add(r.user_id);
      }
    }

    const totalStudentsCount = studentUserIds.size;

    const { data: protoCourse } = await supabase
      .from("courses")
      .select("id")
      .eq("slug", "protocolo-4d")
      .maybeSingle();
    let avgProgress = 0;
    let completedCount = 0;

    if (protoCourse) {
      const { data: cycles } = await supabase
        .from("cycles")
        .select("id")
        .eq("course_id", protoCourse.id);
      const cIds = (cycles ?? []).map((c) => c.id);

      const [lessonsRes, goalsRes, examsRes] = await Promise.all([
        cIds.length
          ? supabase.from("lessons").select("id").in("cycle_id", cIds)
          : Promise.resolve({ data: [] }),
        cIds.length
          ? supabase.from("question_goals").select("id").in("cycle_id", cIds)
          : Promise.resolve({ data: [] }),
        supabase.from("mock_exams").select("id").eq("course_id", protoCourse.id),
      ]);

      const lessons = lessonsRes.data ?? [];
      const goals = goalsRes.data ?? [];
      const exams = examsRes.data ?? [];
      const total = lessons.length + goals.length + exams.length;

      const { data: enrolledUsers } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", protoCourse.id);
      const userIds = (enrolledUsers ?? []).map((e) => e.user_id);

      if (total > 0 && userIds.length > 0) {
        const [lpRes, gpRes, epRes] = await Promise.all([
          supabase.from("lesson_progress").select("user_id").in("user_id", userIds),
          supabase.from("goal_progress").select("user_id").in("user_id", userIds),
          supabase.from("exam_progress").select("user_id").in("user_id", userIds),
        ]);

        const lp = lpRes.data ?? [];
        const gp = gpRes.data ?? [];
        const ep = epRes.data ?? [];

        const counts: Record<string, number> = {};
        for (const r of [...lp, ...gp, ...ep]) {
          counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
        }

        const percents = userIds.map((u) =>
          Math.min(100, Math.round(((counts[u] ?? 0) / total) * 100)),
        );
        avgProgress = percents.length
          ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
          : 0;
        completedCount = percents.filter((p) => p >= 100).length;
      }
    }

    return {
      students: totalStudentsCount,
      courses: coursesRes.count ?? 0,
      enrollments: enrollments.length,
      lessons: lessonsCountRes.count ?? 0,
      avgProgress,
      completed: completedCount,
    };
  } catch (err) {
    console.error("Erro ao carregar estatísticas do admin:", err);
    return { students: 0, courses: 0, enrollments: 0, lessons: 0, avgProgress: 0, completed: 0 };
  }
}

function AdminHome() {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat icon={Users} label="Alunos cadastrados" value={data?.students ?? "..."} />
      <Stat icon={BookOpen} label="Cursos" value={data?.courses ?? "..."} />
      <Stat
        icon={TrendingUp}
        label="Progresso médio"
        value={data ? `${data.avgProgress}%` : "..."}
      />
      <Stat icon={Trophy} label="Concluíram o 4D" value={data?.completed ?? "..."} />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-bold text-gold">{value}</div>
    </div>
  );
}
