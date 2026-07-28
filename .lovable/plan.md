
# Plataforma Informática com Jhon — Área de Membros

Vou construir a plataforma completa em fases. Como é um escopo grande, faço a **Fase 1 (fundação funcional completa)** neste primeiro turno e refino a partir do seu feedback.

## Stack e infraestrutura

- **Frontend:** TanStack Start + React + Tailwind + shadcn (já configurado).
- **Backend:** Lovable Cloud (banco Postgres, autenticação, storage de PDFs, funções serverless) — sem contas externas.
- **Autenticação:** e-mail + senha, recuperação por e-mail, sessão persistente, logout.
- **Controle de acesso:** tabela `user_roles` separada + função `has_role()` (padrão seguro, sem escalonamento de privilégio).
- **Storage:** bucket privado para PDFs, com URLs assinadas.

## Identidade visual

Design system em `src/styles.css` com tokens semânticos (oklch):
- Azul-marinho profundo como `--background` do app logado
- Azul elétrico como `--primary`
- Dourado como `--accent` (destaques, medalhas, badges de progresso)
- Branco, cinzas neutros para superfícies
- Gradientes, sombras "elegant", cards arredondados, tipografia moderna (Space Grotesk + Inter)
- Totalmente responsivo, mobile-first

## Modelo de dados (Fase 1)

```text
profiles(id, full_name, email, whatsapp, created_at)
user_roles(user_id, role)  -- 'admin' | 'student'
courses(id, slug, title, description, cover_url, is_active, sort_order)
cycles(id, course_id, number, title, description, sort_order)
lessons(id, cycle_id, title, description, video_url, release_offset_days, sort_order, is_active)
materials(id, lesson_id, title, file_path, sort_order)
question_goals(id, cycle_id, title, description, question_count, external_url, release_offset_days)
mock_exams(id, course_id, number, title, description, external_url, release_offset_days)
enrollments(user_id, course_id, enrolled_at)  -- controla data-base para liberação
lesson_progress(user_id, lesson_id, completed_at)
goal_progress(user_id, goal_id, completed_at)
exam_progress(user_id, exam_id, completed_at)
```

RLS em todas as tabelas. Liberação de conteúdo calculada por `enrolled_at + release_offset_days` → permite semanas 0/7/14/21 e escala para futuros cursos.

## Rotas

**Públicas**
- `/` — landing com branding e CTA
- `/auth` — login + cadastro (tabs)
- `/reset-password` — definir nova senha

**Aluno (`_authenticated`)**
- `/dashboard` — cards de "Meus Cursos" + progresso geral
- `/curso/$slug` — visão do curso com os 4 ciclos
- `/curso/$slug/aula/$lessonId` — player + PDFs + marcar concluída
- `/curso/$slug/meta/$goalId` — meta de questões
- `/curso/$slug/simulado/$examId` — simulado
- `/progresso` — resumo detalhado
- `/perfil` — editar nome/whatsapp + trocar senha

**Admin (`_authenticated/admin`, gate por role)**
- `/admin` — indicadores (total alunos, ativos, progresso médio, concluintes)
- `/admin/alunos`
- `/admin/cursos` (CRUD)
- `/admin/cursos/$id` — gerencia ciclos, aulas, PDFs, metas, simulados

## Seed inicial

Migração cria automaticamente:
- Curso **PROTOCOLO 4D** (ativo)
- 4 ciclos (1D, 2D, 3D, 4D)
- 4 videoaulas (offsets 0/7/14/21 dias)
- 4 metas de questões
- 4 simulados
- Placeholders de URL de vídeo/link que o admin edita depois

## Fluxo de liberação

- No cadastro, o aluno é matriculado no Protocolo 4D (`enrollments.enrolled_at = now()`).
- Conteúdo aparece como **Bloqueado** até `enrolled_at + release_offset_days <= now()`, mostrando "Esta aula será liberada em breve" + data prevista.
- Após liberação: **Disponível** → **Em andamento** → **Concluído**.

## Progresso

- Botões "Marcar como concluída" em aulas/metas/simulados criam registro em `*_progress`.
- Dashboard calcula % geral = concluídos / total do curso e mostra breakdowns (Videoaulas X/4, Metas X/4, Simulados X/4).

## O que fica para próximas fases (após seu OK)

- Player de vídeo embutido customizado (Fase 1 usa iframe do YouTube/Vimeo pela URL cadastrada).
- Simulados nativos dentro da plataforma (Fase 1 usa link externo, conforme você descreveu).
- Múltiplos cursos populados (estrutura já suporta; cadastro pelo admin).
- E-mail transacional customizado (Fase 1 usa e-mail padrão do Cloud para reset).

## Perguntas rápidas antes de codar

Só duas coisas que mudam o resultado final e que prefiro confirmar:

1. **Primeiro admin:** você quer que eu configure o admin por e-mail (você me passa o e-mail e um trigger promove esse usuário assim que ele se cadastrar), ou que qualquer usuário criado com um "código de convite" vire admin?
2. **Login social:** adiciono também **Login com Google** junto ao e-mail/senha, ou só e-mail/senha nesta primeira versão?

Se preferir, responda "toca o barco" que sigo com: admin = primeiro e-mail que você me informar depois via prompt curto, e apenas e-mail/senha. Assim já entrego a Fase 1 completa.
