import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function toEmbedUrl(url: string) {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vim = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  return url;
}

type Props = {
  videoUrl?: string;
  videoFilePath?: string;
  title?: string;
  onProgress?: (pct: number) => void;
};

export function VideoPlayer({ videoUrl, videoFilePath, title, onProgress }: Props) {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    async function loadSigned() {
      if (!videoFilePath) return;
      const { data } = await supabase.storage.from("course-materials").createSignedUrl(videoFilePath, 3600);
      if (!cancel && data) setSignedUrl(data.signedUrl);
    }
    loadSigned();
    return () => { cancel = true; };
  }, [videoFilePath]);

  const hasFile = !!videoFilePath;
  const embed = !hasFile ? toEmbedUrl(videoUrl ?? "") : "";

  if (hasFile) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-elegant">
        {signedUrl ? (
          <video
            ref={videoRef}
            src={signedUrl}
            controls
            controlsList="nodownload"
            playsInline
            className="aspect-video w-full"
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (!v.duration) return;
              const pct = (v.currentTime / v.duration) * 100;
              if (!notifiedRef.current && pct >= 90 && onProgress) {
                notifiedRef.current = true;
                onProgress(pct);
              }
            }}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-muted-foreground">Carregando vídeo...</div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-elegant">
      {embed ? (
        <div className="aspect-video">
          <iframe
            src={embed}
            title={title ?? "Vídeo"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center text-muted-foreground">
          Vídeo ainda não configurado pelo administrador.
        </div>
      )}
    </div>
  );
}
