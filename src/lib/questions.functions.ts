import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  goalId: z.string().uuid(),
  count: z.number().int().min(1).max(30).default(10),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

export const generateQuestionsFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    await assertAdmin(supabase, context.userId);

    const { data: goal, error: goalErr } = await supabase
      .from("question_goals")
      .select("id, title, subject, pdf_path, description")
      .eq("id", data.goalId)
      .maybeSingle();
    if (goalErr || !goal) throw new Error("Meta não encontrada.");
    if (!goal.pdf_path) throw new Error("Envie um PDF-base antes de gerar as questões.");

    // Download PDF from storage
    const { data: file, error: fileErr } = await supabase.storage
      .from("course-materials")
      .download(goal.pdf_path);
    if (fileErr || !file) throw new Error("Não foi possível ler o PDF-base.");
    const buf = await file.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const mime = (file as any).type || "application/pdf";

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente.");

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            'Você é um elaborador de questões de concurso público em português do Brasil. Gere questões objetivas de múltipla escolha (5 alternativas: A, B, C, D, E) baseadas EXCLUSIVAMENTE no conteúdo do PDF fornecido. Cada questão deve ter APENAS UMA alternativa correta e uma breve explicação. Responda SOMENTE com JSON válido no formato: {"questions":[{"statement":"...","options":[{"label":"A","content":"...","is_correct":false},...],"explanation":"..."}]}',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Assunto: ${goal.subject || goal.title}\nGere ${data.count} questões objetivas de múltipla escolha no idioma português (pt-BR), baseadas EXCLUSIVAMENTE no PDF em anexo. Retorne apenas o JSON.`,
            },
            {
              type: "file",
              file: { filename: "material.pdf", file_data: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429)
        throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
      if (res.status === 402)
        throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na IA (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as any;
    const raw = json?.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      const cleaned = String(raw)
        .replace(/^```json\s*|\s*```$/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("A IA retornou um formato inválido. Tente novamente.");
    }
    const questions: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
    if (questions.length === 0) throw new Error("Nenhuma questão foi gerada.");

    // Wipe drafts (unpublished) and insert new
    await supabase.from("questions").delete().eq("goal_id", goal.id).eq("is_published", false);

    let inserted = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q?.statement || !Array.isArray(q?.options)) continue;
      const { data: qRow, error: qErr } = await supabase
        .from("questions")
        .insert({
          goal_id: goal.id,
          statement: String(q.statement),
          explanation: String(q.explanation ?? ""),
          order_index: i,
          is_published: false,
        })
        .select("id")
        .single();
      if (qErr || !qRow) continue;
      const opts = (q.options as any[]).slice(0, 6).map((o, idx) => ({
        question_id: qRow.id,
        label: String(o.label ?? String.fromCharCode(65 + idx)),
        content: String(o.content ?? ""),
        is_correct: !!o.is_correct,
        order_index: idx,
      }));
      if (opts.length && !opts.some((o) => o.is_correct)) opts[0].is_correct = true;
      await supabase.from("question_options").insert(opts);
      inserted++;
    }

    return { inserted };
  });

export const publishGoalQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ goalId: z.string().uuid(), publish: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("questions")
      .update({ is_published: data.publish })
      .eq("goal_id", data.goalId);
    if (error) throw new Error(error.message);
    // Update goal question_count
    const { count } = await context.supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("goal_id", data.goalId)
      .eq("is_published", true);
    await context.supabase
      .from("question_goals")
      .update({ question_count: count ?? 0 })
      .eq("id", data.goalId);
    return { ok: true };
  });
