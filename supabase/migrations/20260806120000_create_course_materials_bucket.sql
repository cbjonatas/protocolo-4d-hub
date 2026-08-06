-- Criação do bucket 'course-materials' na tabela storage.buckets se ele não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('course-materials', 'course-materials', false, null, null)
ON CONFLICT (id) DO NOTHING;
