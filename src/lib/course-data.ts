import { supabase } from "@/integrations/supabase/client";

export type Status = "locked" | "available" | "in_progress" | "completed";

export function computeStatus(
  releaseOffsetDays: number,
  enrolledAt: string | undefined,
  completed: boolean,
): { status: Status; releaseDate: Date | null } {
  if (!enrolledAt) return { status: "locked", releaseDate: null };
  const release = new Date(new Date(enrolledAt).getTime() + releaseOffsetDays * 86400_000);
  const now = new Date();
  if (completed) return { status: "completed", releaseDate: release };
  if (release > now) return { status: "locked", releaseDate: release };
  return { status: "available", releaseDate: release };
}

export function formatReleaseDate(d: Date | null) {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export async function fetchCourseBySlug(slug: string) {
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !course) throw new Error("Curso não encontrado");
  return course;
}

export async function fetchFullCourse(slug: string) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) {
    return {
      course: {
        id: "",
        slug: "protocolo-4d",
        title: "Protocolo 4D",
        description: "",
        is_active: true,
      },
      enrollment: null,
      cycles: [],
      lessons: [],
      goals: [],
      exams: [],
      lessonProgress: new Set<string>(),
      goalProgress: new Set<string>(),
      examProgress: new Set<string>(),
    };
  }

  const [cycles, enrollment, examsRes] = await Promise.all([
    supabase.from("cycles").select("*").eq("course_id", course.id).order("sort_order"),
    userId
      ? supabase
          .from("enrollments")
          .select("*")
          .eq("course_id", course.id)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("mock_exams").select("*").eq("course_id", course.id).order("sort_order"),
  ]);
  const cycleIds = (cycles.data ?? []).map((c) => c.id);

  const [lessonsRes, goalsRes, lessonProgRes, goalProgRes, examProgRes] = await Promise.all([
    cycleIds.length
      ? supabase.from("lessons").select("*").in("cycle_id", cycleIds).order("sort_order")
      : Promise.resolve({ data: [] }),
    cycleIds.length
      ? supabase.from("question_goals").select("*").in("cycle_id", cycleIds).order("sort_order")
      : Promise.resolve({ data: [] }),
    userId
      ? supabase.from("lesson_progress").select("*").eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase.from("goal_progress").select("*").eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase.from("exam_progress").select("*").eq("user_id", userId)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    course,
    enrollment: enrollment.data,
    cycles: cycles.data ?? [],
    lessons: lessonsRes.data ?? [],
    goals: goalsRes.data ?? [],
    exams: examsRes.data ?? [],
    lessonProgress: new Set((lessonProgRes.data ?? []).map((r: any) => r.lesson_id)),
    goalProgress: new Set((goalProgRes.data ?? []).map((r: any) => r.goal_id)),
    examProgress: new Set((examProgRes.data ?? []).map((r: any) => r.exam_id)),
  };
}

export type FullCourse = Awaited<ReturnType<typeof fetchFullCourse>>;
