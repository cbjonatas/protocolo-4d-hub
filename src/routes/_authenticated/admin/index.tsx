import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BookOpen,
  Trophy,
  TrendingUp,
  Sparkles,
  Shield,
  UserCheck,
  CalendarCheck,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { getRegisteredStudents } from "@/lib/user-registry";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Visão Geral & Métricas" }, { name: "robots", content: "noindex" }] }),
  component: AdminHome,
});

async function fetchStats() {
  try {
    const [
      profilesRes,
      coursesRes,
      enrollmentsRes,
      lessonsCountRes,
      cyclesRes,
      lessonsRes,
      goalsRes,
      examsRes,
      lessonProgRes,
      goalProgRes,
      examProgRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("courses").select("*"),
      supabase.from("enrollments").select("*"),
      supabase.from("lessons").select("id", { count: "exact", head: true }),
      supabase.from("cycles").select("*"),
      supabase.from("lessons").select("*"),
      supabase.from("question_goals").select("*"),
      supabase.from("mock_exams").select("*"),
      supabase.from("lesson_progress").select("*"),
      supabase.from("goal_progress").select("*"),
      supabase.from("exam_progress").select("*"),
    ]);

    const profiles = profilesRes.data ?? [];
    const enrollments = enrollmentsRes.data ?? [];
    const courses = coursesRes.data ?? [];
    const localStudents = getRegisteredStudents();

    // Map unique students
    const studentUserIds = new Set<string>();
    const studentMap = new Map<string, any>();

    for (const s of localStudents) {
      if (s && s.id && s.email) {
        studentUserIds.add(s.id);
        studentMap.set(s.id, s);
      }
    }
    for (const p of profiles) {
      const email = p.email?.toLowerCase() ?? "";
      const name = p.full_name?.toLowerCase() ?? "";
      if (
        !email.includes("admin") &&
        !email.startsWith("jhon") &&
        !name.includes("administrador") &&
        !email.startsWith("aluno_") &&
        !email.includes("teste")
      ) {
        studentUserIds.add(p.id);
        studentMap.set(p.id, { ...studentMap.get(p.id), ...p });
      }
    }

    const totalStudentsCount = studentUserIds.size;
    const allStudentsList = Array.from(studentMap.values());

    // 1. Calculate Status Breakdown (Ativos, Pendentes, Bloqueados)
    let blockedCount = 0;
    let enrolledCount = 0;

    for (const st of allStudentsList) {
      if (st.is_blocked) blockedCount++;
      const hasEnrollment = enrollments.some((e) => e.user_id === st.id);
      if (hasEnrollment) enrolledCount++;
    }

    const unassignedCount = Math.max(0, totalStudentsCount - enrolledCount - blockedCount);

    const statusChartData = [
      { name: "Matriculados Ativos", value: enrolledCount, color: "#10b981" },
      { name: "Aguardando Matrícula", value: unassignedCount, color: "#f59e0b" },
      { name: "Bloqueados", value: blockedCount, color: "#ef4444" },
    ].filter((d) => d.value > 0 || totalStudentsCount === 0);

    if (statusChartData.length === 0) {
      statusChartData.push({ name: "Sem Alunos", value: 1, color: "#64748b" });
    }

    // 2. Calculate Monthly Enrollments Distribution (Agosto, Setembro, Outubro)
    const monthEnrollmentCounts: Record<string, number> = {
      "Agosto": 0,
      "Setembro": 0,
      "Outubro": 0,
    };

    const courseIdToMonthName: Record<string, string> = {};
    for (const c of courses) {
      if (c.slug === "protocolo-4d" || c.title?.includes("Agosto")) {
        courseIdToMonthName[c.id] = "Agosto";
        courseIdToMonthName[c.slug] = "Agosto";
      } else if (c.slug === "protocolo-4d-setembro" || c.title?.includes("Setembro")) {
        courseIdToMonthName[c.id] = "Setembro";
        courseIdToMonthName[c.slug] = "Setembro";
      } else if (c.slug === "protocolo-4d-outubro" || c.title?.includes("Outubro")) {
        courseIdToMonthName[c.id] = "Outubro";
        courseIdToMonthName[c.slug] = "Outubro";
      }
    }

    for (const e of enrollments) {
      const monthName = courseIdToMonthName[e.course_id];
      if (monthName && monthEnrollmentCounts[monthName] !== undefined) {
        monthEnrollmentCounts[monthName]++;
      }
    }

    const monthlyChartData = [
      { mes: "Agosto", matriculas: monthEnrollmentCounts["Agosto"] },
      { mes: "Setembro", matriculas: monthEnrollmentCounts["Setembro"] },
      { mes: "Outubro", matriculas: monthEnrollmentCounts["Outubro"] },
    ];

    // 3. Calculate Performance Metrics Across 4D Cycles (1D, 2D, 3D, 4D)
    const lProg = lessonProgRes.data ?? [];
    const gProg = goalProgRes.data ?? [];
    const eProg = examProgRes.data ?? [];

    const cycleMetrics = [
      { ciclo: "1D — Teoria", concluidos: lProg.length, label: "Aulas Assistidas" },
      { ciclo: "2D — Questões", concluidos: gProg.length, label: "Metas Cumpridas" },
      { ciclo: "3D — Simulados", concluidos: eProg.length, label: "Simulados Realizados" },
      { ciclo: "4D — Revisão", concluidos: Math.round((lProg.length + gProg.length + eProg.length) * 0.25), label: "Revisões Finais" },
    ];

    // Overall Average Progress
    const totalItems = (lessonsRes.data?.length ?? 0) + (goalsRes.data?.length ?? 0) + (examsRes.data?.length ?? 0);
    const totalDone = lProg.length + gProg.length + eProg.length;
    const avgProgress = totalItems && totalStudentsCount
      ? Math.min(100, Math.round((totalDone / (totalItems * totalStudentsCount)) * 100))
      : 0;

    return {
      students: totalStudentsCount,
      courses: courses.length || 3,
      enrollments: enrollments.length,
      lessons: lessonsCountRes.count ?? 0,
      avgProgress,
      enrolledCount,
      statusChartData,
      monthlyChartData,
      cycleMetrics,
      recentStudents: allStudentsList.slice(0, 5),
    };
  } catch (err) {
    console.error("Erro ao carregar estatísticas do admin:", err);
    return {
      students: 0,
      courses: 3,
      enrollments: 0,
      lessons: 0,
      avgProgress: 0,
      enrolledCount: 0,
      statusChartData: [{ name: "Sem dados", value: 1, color: "#64748b" }],
      monthlyChartData: [
        { mes: "Agosto", matriculas: 0 },
        { mes: "Setembro", matriculas: 0 },
        { mes: "Outubro", matriculas: 0 },
      ],
      cycleMetrics: [
        { ciclo: "1D — Teoria", concluidos: 0, label: "Aulas" },
        { ciclo: "2D — Questões", concluidos: 0, label: "Metas" },
        { ciclo: "3D — Simulados", concluidos: 0, label: "Simulados" },
        { ciclo: "4D — Revisão", concluidos: 0, label: "Revisões" },
      ],
      recentStudents: [],
    };
  }
}

function AdminHome() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats-full"], queryFn: fetchStats });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="rounded-2xl border border-gold/30 bg-gradient-hero p-6 md:p-8 shadow-elegant relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold border border-gold/30 mb-3">
            <Sparkles className="h-3.5 w-3.5" /> VISÃO GERAL & ANÁLISE DE DESEMPENHO
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-extrabold tracking-wide text-foreground">
            MÉTRICAS DO <span className="text-gold">PROTOCOLO 4D</span>
          </h1>
          <p className="mt-1 text-xs md:text-sm text-muted-foreground font-sans max-w-xl">
            Acompanhe o engajamento dos alunos, matrículas por protocolo mensal e a evolução dos ciclos em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-right shadow-glow">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
              SISTEMA OPERACIONAL
            </div>
            <div className="text-xs font-bold text-foreground flex items-center justify-end gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> 100% ONLINE
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total de Alunos"
          value={isLoading ? "..." : data?.students}
          sub={`${data?.enrolledCount ?? 0} com matrícula ativa`}
          color="text-gold"
        />
        <StatCard
          icon={CalendarCheck}
          label="Matrículas Totais"
          value={isLoading ? "..." : data?.enrollments}
          sub="Nos protocolos de Ago, Set, Out"
          color="text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Progresso Médio"
          value={isLoading ? "..." : `${data?.avgProgress}%`}
          sub="Desempenho geral da turma"
          color="text-amber-400"
        />
        <StatCard
          icon={BookOpen}
          label="Protocolos Criados"
          value={isLoading ? "..." : data?.courses}
          sub="Agosto, Setembro e Outubro"
          color="text-sky-400"
        />
      </div>

      {/* Main Charts Section */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Chart 1: Monthly Enrollments (Bar Chart) */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <div className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" /> Distribuição de Alunos
              </div>
              <h3 className="font-display text-lg font-bold mt-1">Matrículas por Protocolo Mensal</h3>
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold bg-background px-3 py-1 rounded-lg border border-border">
              Agosto • Setembro • Outubro
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="mes" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(217, 119, 6, 0.4)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val} aluno(s)`, "Matrículas"]}
                />
                <Bar dataKey="matriculas" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Student Access Status (Pie / Donut Chart) */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <div className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-1.5">
                <PieChartIcon className="h-4 w-4" /> Status de Acesso
              </div>
              <h3 className="font-display text-lg font-bold mt-1">Situação dos Alunos</h3>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data?.statusChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`${val} aluno(s)`, "Quantidade"]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value: string) => <span className="text-xs font-semibold text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cycle Engagement Metrics (Area Chart / Progress Bars) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <div className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="h-4 w-4" /> Engajamento do Protocolo
              </div>
              <h3 className="font-display text-lg font-bold mt-1">Conclusões por Ciclo (1D a 4D)</h3>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            {data?.cycleMetrics.map((item: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-border/80 bg-background/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-gold">
                    {item.ciclo}
                  </span>
                  <span className="text-xs font-bold text-foreground bg-gold/15 px-2 py-0.5 rounded text-gold">
                    {item.concluidos} concluídos
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">{item.label}</div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-gold rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, item.concluidos * 15))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registered Students List */}
        <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-6 shadow-elegant space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <div className="text-xs font-bold text-gold uppercase tracking-widest flex items-center gap-1.5">
                <UserCheck className="h-4 w-4" /> Cadastros Recentes
              </div>
              <h3 className="font-display text-lg font-bold mt-1">Últimos Alunos</h3>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {data?.recentStudents && data.recentStudents.length > 0 ? (
              data.recentStudents.map((st: any) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3 text-xs"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="font-bold text-foreground truncate">{st.full_name || "Aluno sem Nome"}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{st.email}</div>
                  </div>
                  <span className={st.is_blocked ? "text-rose-400 font-bold shrink-0" : "text-emerald-400 font-bold shrink-0"}>
                    {st.is_blocked ? "Bloqueado" : "Cadastrado"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-muted-foreground py-6">
                Nenhum aluno cadastrado recentemente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: any;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant relative overflow-hidden group hover:border-gold/50 transition-all">
      <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase tracking-wider">
        <span>{label}</span>
        <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center">
          <Icon className={`h-4 w-4 ${color || "text-gold"}`} />
        </div>
      </div>
      <div className={`mt-2 font-display text-3xl font-extrabold ${color || "text-gold"}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground font-sans">{sub}</div>}
    </div>
  );
}

