import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, Trophy, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Painel", }, { name: "robots", content: "noindex" }] }),
  component: AdminHome,
});

async function fetchStats() {
  const [profiles, courses, enrollments, lessonsCount, examProgress] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("enrollments").select("user_id, course_id"),
    supabase.from("lessons").select("id", { count: "exact", head: true }),
    supabase.from("exam_progress").select("user_id, exam_id"),
  ]);

  // average progress = completions / total content items per student (over Protocolo 4D)
  const [{ data: protoCourse }] = await Promise.all([
    supabase.from("courses").select("id").eq("slug", "protocolo-4d").maybeSingle(),
  ]);
  let avgProgress = 0;
  let completedCount = 0;
  if (protoCourse) {
    const [{ data: cycles }, { data: exams }] = await Promise.all([
      supabase.from("cycles").select("id").eq("course_id", protoCourse.id),
      supabase.from("mock_exams").select("id").eq("course_id", protoCourse.id),
    ]);
    const cIds = (cycles ?? []).map(c => c.id);
    const [{ data: lessons }, { data: goals }] = cIds.length
      ? await Promise.all([
          supabase.from("lessons").select("id").in("cycle_id", cIds),
          supabase.from("question_goals").select("id").in("cycle_id", cIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];
    const total = (lessons?.length ?? 0) + (goals?.length ?? 0) + (exams?.length ?? 0);
    const { data: enrolledUsers } = await supabase.from("enrollments").select("user_id").eq("course_id", protoCourse.id);
    const userIds = (enrolledUsers ?? []).map(e => e.user_id);
    if (total && userIds.length) {
      const [{ data: lp }, { data: gp }, { data: ep }] = await Promise.all([
        supabase.from("lesson_progress").select("user_id").in("user_id", userIds),
        supabase.from("goal_progress").select("user_id").in("user_id", userIds),
        supabase.from("exam_progress").select("user_id").in("user_id", userIds),
      ]);
      const counts: Record<string, number> = {};
      for (const r of [...(lp ?? []), ...(gp ?? []), ...(ep ?? [])]) counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
      const percents = userIds.map(u => Math.min(100, Math.round(((counts[u] ?? 0) / total) * 100)));
      avgProgress = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
      completedCount = percents.filter(p => p >= 100).length;
    }
  }

  return {
    students: profiles.count ?? 0,
    courses: courses.count ?? 0,
    enrollments: enrollments.data?.length ?? 0,
    lessons: lessonsCount.count ?? 0,
    avgProgress,
    completed: completedCount,
  };
}

function AdminHome() {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat icon={Users} label="Alunos cadastrados" value={data?.students ?? "..."} />
      <Stat icon={BookOpen} label="Cursos" value={data?.courses ?? "..."} />
      <Stat icon={TrendingUp} label="Progresso médio" value={data ? `${data.avgProgress}%` : "..."} />
      <Stat icon={Trophy} label="Concluíram o 4D" value={data?.completed ?? "..."} />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-2 font-display text-3xl font-bold text-gold">{value}</div>
    </div>
  );
}
