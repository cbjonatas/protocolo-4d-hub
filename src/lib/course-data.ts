import { supabase } from "@/integrations/supabase/client";

export type Status = "locked" | "available" | "in_progress" | "completed";

export function computeStatus(
  releaseOffsetDays: number,
  enrolledAt: string | undefined,
  completed: boolean,
): { status: Status; releaseDate: Date | null } {
  const baseTime = enrolledAt ? new Date(enrolledAt).getTime() : Date.now();
  const release = new Date(baseTime + releaseOffsetDays * 86400_000);
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

export const DEFAULT_CYCLES = [
  {
    id: "cycle-1",
    course_id: "protocolo-4d-id",
    number: 1,
    title: "Fundamentos de Informática & Hardware",
    description: "Conceitos básicos, componentes do computador e periféricos.",
    sort_order: 1,
    status: "ativo" as const,
    created_at: new Date().toISOString(),
  },
  {
    id: "cycle-2",
    course_id: "protocolo-4d-id",
    number: 2,
    title: "Sistemas Operacionais & Arquivos",
    description: "Windows, Linux, gerenciamento de arquivos e atalhos essenciais.",
    sort_order: 2,
    status: "arquivado" as const,
    created_at: new Date().toISOString(),
  },
  {
    id: "cycle-3",
    course_id: "protocolo-4d-id",
    number: 3,
    title: "Redes de Computadores & Internet",
    description: "Protocolos IP, TCP/UDP, navegadores e serviços web.",
    sort_order: 3,
    status: "arquivado" as const,
    created_at: new Date().toISOString(),
  },
  {
    id: "cycle-4",
    course_id: "protocolo-4d-id",
    number: 4,
    title: "Segurança da Informação & Malware",
    description: "Práticas de segurança, vírus, ransomware, firewall e criptografia.",
    sort_order: 4,
    status: "arquivado" as const,
    created_at: new Date().toISOString(),
  },
];

export const DEFAULT_LESSONS = [
  {
    id: "lesson-1",
    cycle_id: "cycle-1",
    title: "Vídeo Aula 01 — Fundamentos de Informática & Hardware",
    description:
      "Assista à aula completa do Ciclo 01 diretamente na plataforma e acompanhe os conceitos-chave de Informática.",
    video_url: "https://www.youtube.com/watch?v=IHjymfZBAsM",
    video_file_path: "",
    release_offset_days: 0,
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lesson-2",
    cycle_id: "cycle-2",
    title: "Vídeo Aula 02 — Sistemas Operacionais & Arquivos",
    description:
      "Assista à aula completa do Ciclo 02 diretamente na plataforma e acompanhe os conceitos de Windows e Linux.",
    video_url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
    video_file_path: "",
    release_offset_days: 0,
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lesson-3",
    cycle_id: "cycle-3",
    title: "Vídeo Aula 03 — Redes de Computadores & Internet",
    description:
      "Assista à aula completa do Ciclo 03 diretamente na plataforma e entenda redes e navegadores.",
    video_url: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
    video_file_path: "",
    release_offset_days: 0,
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "lesson-4",
    cycle_id: "cycle-4",
    title: "Vídeo Aula 04 — Segurança da Informação & Malware",
    description:
      "Assista à aula completa do Ciclo 04 diretamente na plataforma sobre vírus, firewall e criptografia.",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    video_file_path: "",
    release_offset_days: 0,
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DEFAULT_GOALS = [
  {
    id: "goal-1",
    cycle_id: "cycle-1",
    title: "Meta de Questões 01",
    subject: "Fundamentos de Informática & Hardware",
    description: "Responda às questões práticas sobre Hardware e Conceitos para fixar o conteúdo.",
    question_count: 10,
    pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    external_url: "",
    release_offset_days: 0,
    sort_order: 1,
  },
  {
    id: "goal-2",
    cycle_id: "cycle-2",
    title: "Meta de Questões 02",
    subject: "Sistemas Operacionais & Arquivos",
    description: "Responda às questões práticas sobre Windows e Linux.",
    question_count: 10,
    pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    external_url: "",
    release_offset_days: 0,
    sort_order: 1,
  },
  {
    id: "goal-3",
    cycle_id: "cycle-3",
    title: "Meta de Questões 03",
    subject: "Redes de Computadores & Internet",
    description: "Responda às questões práticas sobre Redes e Internet.",
    question_count: 10,
    pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    external_url: "",
    release_offset_days: 0,
    sort_order: 1,
  },
  {
    id: "goal-4",
    cycle_id: "cycle-4",
    title: "Meta de Questões 04",
    subject: "Segurança da Informação & Malware",
    description: "Responda às questões práticas sobre Segurança e Práticas.",
    question_count: 10,
    pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    external_url: "",
    release_offset_days: 0,
    sort_order: 1,
  },
];

export const DEFAULT_EXAMS = [
  {
    id: "exam-1",
    course_id: "protocolo-4d-id",
    number: 1,
    title: "Simulado 01 — Fundamentos de Informática",
    description: "Simulado completo cobrindo o Ciclo 01.",
    pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    external_url: "",
    answer_key_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    answer_key_url: "",
    correction_video_url: "https://www.youtube.com/watch?v=L_LUpnjgPso",
    correction_url: "",
    release_offset_days: 0,
    sort_order: 1,
  },
  {
    id: "exam-2",
    course_id: "protocolo-4d-id",
    number: 2,
    title: "Simulado 02 — Sistemas Operacionais",
    description: "Simulado completo cobrindo o Ciclo 02.",
    pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    external_url: "",
    answer_key_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    answer_key_url: "",
    correction_video_url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
    correction_url: "",
    release_offset_days: 0,
    sort_order: 2,
  },
  {
    id: "exam-3",
    course_id: "protocolo-4d-id",
    number: 3,
    title: "Simulado 03 — Redes de Computadores",
    description: "Simulado completo cobrindo o Ciclo 03.",
    pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    external_url: "",
    answer_key_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    answer_key_url: "",
    correction_video_url: "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
    correction_url: "",
    release_offset_days: 0,
    sort_order: 3,
  },
  {
    id: "exam-4",
    course_id: "protocolo-4d-id",
    number: 4,
    title: "Simulado 04 — Segurança da Informação",
    description: "Simulado completo cobrindo o Ciclo 04.",
    pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    external_url: "",
    answer_key_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    answer_key_url: "",
    correction_video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    correction_url: "",
    release_offset_days: 0,
    sort_order: 4,
  },
];

export async function fetchFullCourse(slug: string) {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const defaultTitleMap: Record<string, string> = {
    "protocolo-4d": "Protocolo 4D — Agosto",
    "protocolo-4d-setembro": "Protocolo 4D — Setembro",
    "protocolo-4d-outubro": "Protocolo 4D — Outubro",
  };

  const activeCourse = course
    ? course.title === "Protocolo 4D" || course.title === "PROTOCOLO 4D"
      ? { ...course, title: "Protocolo 4D — Agosto" }
      : course
    : {
        id: slug === "protocolo-4d" ? "protocolo-4d-id" : `protocolo-${slug}-id`,
        slug: slug,
        title: defaultTitleMap[slug] ?? `Protocolo 4D — ${slug}`,
        description: "Curso preparatório completo de Informática com Jhon focado em aprovação em concursos públicos.",
        is_active: slug === "protocolo-4d",
      };

  const [cyclesRes, enrollmentRes, examsRes] = await Promise.all([
    supabase.from("cycles").select("*").eq("course_id", activeCourse.id).order("sort_order"),
    userId
      ? supabase
          .from("enrollments")
          .select("*")
          .eq("course_id", activeCourse.id)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("mock_exams").select("*").eq("course_id", activeCourse.id).order("sort_order"),
  ]);

  const dbCycles = cyclesRes.data ?? [];
  const cycleIds = dbCycles.map((c) => c.id);

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

  const cycles = dbCycles.length > 0 ? dbCycles : DEFAULT_CYCLES;
  const lessons = (lessonsRes.data && lessonsRes.data.length > 0) ? lessonsRes.data : DEFAULT_LESSONS;
  const goals = (goalsRes.data && goalsRes.data.length > 0) ? goalsRes.data : DEFAULT_GOALS;
  const exams = (examsRes.data && examsRes.data.length > 0) ? examsRes.data : DEFAULT_EXAMS;

  // Return null if no real enrollment found — computeStatus will use Date.now() as base
  const enrollment = enrollmentRes.data ?? null;

  return {
    course: activeCourse,
    enrollment,
    cycles,
    lessons,
    goals,
    exams,
    lessonProgress: new Set((lessonProgRes.data ?? []).map((r: any) => r.lesson_id)),
    goalProgress: new Set((goalProgRes.data ?? []).map((r: any) => r.goal_id)),
    examProgress: new Set((examProgRes.data ?? []).map((r: any) => r.exam_id)),
  };
}

export type FullCourse = Awaited<ReturnType<typeof fetchFullCourse>>;
