import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

const ToggleInput = z.object({
  userId: z.string().uuid(),
  courseIdOrSlug: z.string().min(1),
  action: z.enum(["enroll", "unenroll"]),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_ALIASES: Record<string, string> = {
  "protocolo-agosto": "protocolo-4d",
  "protocolo-setembro": "protocolo-4d-setembro",
  "protocolo-outubro": "protocolo-4d-outubro",
};

async function resolveCourseId(admin: any, courseIdOrSlug: string): Promise<string> {
  if (UUID_RE.test(courseIdOrSlug)) return courseIdOrSlug;
  const slug = SLUG_ALIASES[courseIdOrSlug] ?? courseIdOrSlug;
  const { data } = await admin.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (data?.id) return data.id;
  const { data: created, error } = await admin
    .from("courses")
    .upsert(
      {
        slug,
        title: "Protocolo 4D — " + slug,
        description: "Protocolo estratégico de preparação em Informática.",
        is_active: true,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível identificar o curso: " + error.message);
  return created.id;
}

export const adminToggleEnrollment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const courseId = await resolveCourseId(supabaseAdmin, data.courseIdOrSlug);

    if (data.action === "unenroll") {
      const { error } = await supabaseAdmin
        .from("enrollments")
        .delete()
        .eq("user_id", data.userId)
        .eq("course_id", courseId);
      if (error) throw new Error(error.message);
      return { success: true, courseId };
    }

    const { data: existing } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", data.userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabaseAdmin
        .from("enrollments")
        .insert({ user_id: data.userId, course_id: courseId });
      if (error) throw new Error(error.message);
    }
    return { success: true, courseId };
  });

export const adminDeleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), email: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = data.userId;

    const { data: attempts } = await supabaseAdmin
      .from("question_attempts")
      .select("id")
      .eq("user_id", uid);
    const attemptIds = (attempts ?? []).map((a: any) => a.id);
    if (attemptIds.length > 0) {
      await supabaseAdmin.from("question_answers").delete().in("attempt_id", attemptIds);
    }
    await supabaseAdmin.from("question_attempts").delete().eq("user_id", uid);
    await supabaseAdmin.from("lesson_progress").delete().eq("user_id", uid);
    await supabaseAdmin.from("goal_progress").delete().eq("user_id", uid);
    await supabaseAdmin.from("exam_progress").delete().eq("user_id", uid);
    await supabaseAdmin.from("enrollments").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("profiles").delete().eq("id", uid);
    await supabaseAdmin.auth.admin.deleteUser(uid);

    return { success: true };
  });

export const adminSetStudentPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(6) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    
    const { data: rpcData, error } = await context.supabase.rpc("admin_set_student_password", {
      p_user_id: data.userId,
      p_new_password: data.password,
    });
    
    if (error) throw new Error("Não foi possível alterar a senha: " + error.message);
    if (rpcData && (rpcData as any).success === false) {
      throw new Error("Não foi possível alterar a senha: " + ((rpcData as any).error || "Erro desconhecido"));
    }
    
    return { success: true };
  });

export const adminSetStudentBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("profiles")
      .update({ is_blocked: data.blocked })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const adminEnrollAllStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ courseIdOrSlug: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const courseId = await resolveCourseId(supabaseAdmin, data.courseIdOrSlug);

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    const { data: existing } = await supabaseAdmin
      .from("enrollments")
      .select("user_id")
      .eq("course_id", courseId);
    const already = new Set((existing ?? []).map((e: any) => e.user_id));
    const rows = (profiles ?? [])
      .filter((p: any) => !already.has(p.id))
      .map((p: any) => ({ user_id: p.id, course_id: courseId }));

    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from("enrollments").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { success: true, enrolled: rows.length, courseId };
  });
