import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in process.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding Protocolo 4D course data...");

  // 1. Create or get course "Protocolo 4D"
  let { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", "protocolo-4d")
    .maybeSingle();

  if (!course) {
    const { data: newCourse, error } = await supabase
      .from("courses")
      .insert({
        slug: "protocolo-4d",
        title: "Protocolo 4D",
        description: "Curso preparatório completo de Informática com Jhon focado em aprovação em concursos públicos.",
        is_active: true,
        sort_order: 1,
      })
      .select("*")
      .single();
    if (error) {
      console.error("Error creating course:", error);
      return;
    }
    course = newCourse;
  }

  console.log("Course ID:", course.id);

  // 2. Create 4 Cycles
  const cycleTitles = [
    { number: 1, title: "Fundamentos de Informática & Hardware", description: "Conceitos básicos, componentes do computador e periféricos." },
    { number: 2, title: "Sistemas Operacionais & Arquivos", description: "Windows, Linux, gerenciamento de arquivos e atalhos essenciais." },
    { number: 3, title: "Redes de Computadores & Internet", description: "Protocolos IP, TCP/UDP, navegadores e serviços web." },
    { number: 4, title: "Segurança da Informação & Malware", description: "Práticas de segurança, vírus, ransomware, firewall e criptografia." },
  ];

  const cycles = [];
  for (const c of cycleTitles) {
    let { data: existingCycle } = await supabase
      .from("cycles")
      .select("*")
      .eq("course_id", course.id)
      .eq("number", c.number)
      .maybeSingle();

    if (!existingCycle) {
      const { data: newCycle, error } = await supabase
        .from("cycles")
        .insert({
          course_id: course.id,
          number: c.number,
          title: c.title,
          description: c.description,
          sort_order: c.number,
        })
        .select("*")
        .single();
      if (error) {
        console.error(`Error creating cycle ${c.number}:`, error);
        continue;
      }
      existingCycle = newCycle;
    }
    cycles.push(existingCycle);
  }

  console.log(`Cycles configured: ${cycles.length}`);

  // 3. Create Video Lessons for each cycle
  const videoUrls = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=L_LUpnjgPso",
    "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
    "https://www.youtube.com/watch?v=fJ9rUzIMcZQ",
  ];

  for (let i = 0; i < cycles.length; i++) {
    const cycle = cycles[i];
    const { data: existingLesson } = await supabase
      .from("lessons")
      .select("*")
      .eq("cycle_id", cycle.id)
      .maybeSingle();

    if (!existingLesson) {
      const lessonTitle = `Vídeo Aula 0${cycle.number} — ${cycle.title}`;
      const videoUrl = videoUrls[i % videoUrls.length];
      const { data: lesson, error } = await supabase
        .from("lessons")
        .insert({
          cycle_id: cycle.id,
          title: lessonTitle,
          description: `Assista à aula completa do Ciclo 0${cycle.number} diretamente na plataforma e acompanhe os conceitos-chave de Informática.`,
          video_url: videoUrl,
          release_offset_days: 0,
          sort_order: 1,
          is_active: true,
        })
        .select("*")
        .single();

      if (error) {
        console.error(`Error creating lesson for cycle ${cycle.number}:`, error);
      } else {
        console.log(`Created lesson for cycle ${cycle.number}:`, lesson.title);

        await supabase.from("materials").insert({
          lesson_id: lesson.id,
          title: `Apostila PDF - ${cycle.title}`,
          file_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          sort_order: 1,
        });
      }
    }

    // 4. Create Question Goals for each cycle
    const { data: existingGoal } = await supabase
      .from("question_goals")
      .select("*")
      .eq("cycle_id", cycle.id)
      .maybeSingle();

    if (!existingGoal) {
      const { data: goal, error } = await supabase
        .from("question_goals")
        .insert({
          cycle_id: cycle.id,
          title: `Meta de Questões 0${cycle.number}`,
          subject: cycle.title,
          description: `Responda às questões práticas sobre ${cycle.title} para fixar o conteúdo.`,
          question_count: 10,
          release_offset_days: 0,
          sort_order: 1,
        })
        .select("*")
        .single();

      if (error) {
        console.error(`Error creating goal for cycle ${cycle.number}:`, error);
      } else if (goal) {
        console.log(`Created goal for cycle ${cycle.number}:`, goal.title);

        for (let qIdx = 1; qIdx <= 3; qIdx++) {
          const { data: question } = await supabase
            .from("questions")
            .insert({
              goal_id: goal.id,
              statement: `Questão 0${qIdx} — Qual dos seguintes conceitos está correto com relação a ${cycle.title}?`,
              explanation: `Gabarito Comentado: Esta questão aborda os fundamentos de ${cycle.title}. A opção A representa a definição oficial cobrada em bancas de concursos.`,
              order_index: qIdx - 1,
              is_published: true,
            })
            .select("*")
            .single();

          if (question) {
            await supabase.from("question_options").insert([
              { question_id: question.id, label: "A", content: "Opção correta conforme a doutrina de informática.", is_correct: true, order_index: 0 },
              { question_id: question.id, label: "B", content: "Incorreta — conceito invertido.", is_correct: false, order_index: 1 },
              { question_id: question.id, label: "C", content: "Incorreta — termo não aplicável.", is_correct: false, order_index: 2 },
              { question_id: question.id, label: "D", content: "Incorreta — exceção descabida.", is_correct: false, order_index: 3 },
            ]);
          }
        }
      }
    }

    // 5. Create Mock Exams for each cycle
    const { data: existingExam } = await supabase
      .from("mock_exams")
      .select("*")
      .eq("course_id", course.id)
      .eq("number", cycle.number)
      .maybeSingle();

    if (!existingExam) {
      const { data: exam, error } = await supabase
        .from("mock_exams")
        .insert({
          course_id: course.id,
          number: cycle.number,
          title: `Simulado 0${cycle.number} — ${cycle.title}`,
          description: `Simulado completo cobrindo todo o conteúdo de ${cycle.title}.`,
          pdf_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          answer_key_path: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          correction_video_url: "https://www.youtube.com/watch?v=L_LUpnjgPso",
          release_offset_days: 0,
          sort_order: cycle.number,
        })
        .select("*")
        .single();

      if (error) {
        console.error(`Error creating exam for cycle ${cycle.number}:`, error);
      } else {
        console.log(`Created exam for cycle ${cycle.number}:`, exam.title);
      }
    }
  }

  console.log("Seeding finished successfully!");
}

seed().catch((err) => console.error(err));
