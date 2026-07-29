# Evolução da área de curso — PROTOCOLO 4D

Objetivo: manter o aluno 100% dentro da aplicação. Player de vídeo embutido, PDFs visualizados in-app, metas de questões interativas com correção automática, simulados com PDF/gabarito/vídeo-correção, e painel admin completo.

## 1. Player de vídeo integrado

- Novo componente `VideoPlayer` que aceita:
  - URLs do YouTube/Vimeo → embed responsivo (iframe do próprio provedor, dentro do card da aula, sem sair).
  - Arquivo de vídeo (mp4/webm) hospedado no bucket privado → `<video controls>` com URL assinada.
- Aula: registra progresso automaticamente ao atingir ~90% de reprodução (evento `timeupdate`), além do botão manual "marcar como concluída".
- Reuso do mesmo player em: `Aula`, `Vídeo de correção do simulado`.
- Totalmente responsivo (aspect-video, controles nativos + fullscreen).

## 2. Metas de questões interativas

Substituir o link externo por um quiz completo.

**Schema novo:**

- `questions` — vinculadas a `question_goals`. Campos de domínio: `statement`, `explanation`, `order_index`.
- `question_options` — alternativas por questão: `label` (A-E), `content`, `is_correct`.
- `question_attempts` — tentativa do aluno: `goal_id`, score, `total`, `correct_count`.
- `question_answers` — resposta por questão dentro de uma tentativa: `attempt_id`, `question_id`, `selected_option_id`, `is_correct`.

**Admin (`/admin/cursos`):**

- Ao editar uma meta: campo assunto + upload PDF-base + botão "Gerar questões com IA" (usa Lovable AI Gateway, modelo `google/gemini-2.5-flash` com PDF como input multimodal, saída estruturada JSON com N questões, 4-5 alternativas cada, resposta correta + explicação).
- Lista as questões geradas; admin pode editar enunciado/alternativas/correta/explicação, adicionar/remover, ou apagar tudo e regerar.

**Aluno (`/curso/$slug/meta/$goalId`):**

- Se meta tem questões: renderiza quiz uma questão por vez, alternativas selecionáveis, botão "Próxima". Ao final: tela de resultado com acertos/erros/percentual, revisão questão a questão (resposta do aluno vs. correta + explicação).
- Registra tentativa em `question_attempts`. Aluno pode refazer.

## 3. Simulados

- Novos campos em `mock_exams`: `pdf_path` (PDF do simulado no storage), `answer_key_path` (PDF do gabarito no storage), `correction_video_url` (vídeo).
- Manter `external_url` / `correction_url` / `answer_key_url` para não quebrar dados existentes; UI prioriza os arquivos internos.
- Aluno: visualiza PDFs via URL assinada (embed `<iframe>` do PDF + botão baixar) e assiste ao vídeo de correção no player integrado.
- Admin: uploads dos PDFs + URL/arquivo de vídeo de correção.

## 4. Materiais em PDF

- Manter bucket `course-materials`. Visualização in-app via `<iframe src={signedUrl}>` num modal/route, com botão de download opcional.

## 5. Painel do aluno (`/progresso`)

Adicionar métricas de questões:

- Total respondidas, acertos, erros, aproveitamento médio, desempenho por ciclo, histórico de tentativas.

## 6. Painel admin

- CRUD completo em `/admin/cursos`: criar/editar cursos, ciclos, aulas, metas, simulados, questões. Uploads de PDFs e vídeos para storage.
- Página `/admin/alunos` já existe — adicionar visualização de desempenho por aluno (tentativas, aproveitamento).

## Detalhes técnicos

### Migrations

1. `questions`, `question_options`, `question_attempts`, `question_answers` (com GRANTs + RLS: aluno lê questões de metas liberadas; admin CRUD total; aluno gerencia apenas próprias tentativas/respostas).
2. `question_goals`: adicionar `subject text`, `pdf_path text`.
3. `mock_exams`: adicionar `pdf_path`, `answer_key_path`, `correction_video_url`.
4. `lessons`: adicionar `video_file_path` (opcional, para uploads).

### Storage

- Bucket `course-materials` já existe (privado). Usar para todos PDFs + vídeos enviados. Políticas: leitura para authenticated (via signed URL), escrita apenas admin.

### IA para geração de questões

- Server function `generateQuestionsFromPdf` (`createServerFn` + `requireSupabaseAuth` + check admin) que:
  - Baixa PDF do storage (admin).
  - Envia ao Lovable AI Gateway (`google/gemini-2.5-flash`) como input multimodal com prompt em pt-BR pedindo N questões estruturadas (JSON schema).
  - Insere em `questions`/`question_options` com `is_active=false` (rascunho) — admin revisa e publica.

### Componentes novos

- `src/components/video-player.tsx`
- `src/components/pdf-viewer.tsx`
- `src/routes/_authenticated/curso.$slug.meta.$goalId.tsx` — reescrita para quiz.
- `src/routes/_authenticated/curso.$slug.simulado.$examId.tsx` — atualizada para PDF + vídeo-correção in-app.
- `src/routes/_authenticated/admin/cursos.tsx` — expandido.
- `src/lib/questions.functions.ts` — server fn de IA.

### Escopo

Manter identidade visual (dark navy + gold), tipografia e componentes shadcn existentes. Nenhuma alteração no fluxo de auth.

## Entregas

Ao final: fluxo admin (criar ciclo → aula → PDF → meta com IA → simulado com PDFs + vídeo) e fluxo aluno (assistir → responder meta → ver resultado → simulado in-app) totalmente funcionais.
