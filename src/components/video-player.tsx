import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function toEmbedUrl(url: string) {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vim = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  const loom = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
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
  const [errorLoadingFile, setErrorLoadingFile] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    async function loadSigned() {
      if (!videoFilePath) {
        setSignedUrl("");
        return;
      }

      if (videoFilePath.startsWith("http://") || videoFilePath.startsWith("https://")) {
        if (!cancel) setSignedUrl(videoFilePath);
        return;
      }

      try {
        const { data } = await supabase.storage
          .from("course-materials")
          .createSignedUrl(videoFilePath, 3600);
        if (!cancel) {
          if (data?.signedUrl) {
            setSignedUrl(data.signedUrl);
          } else {
            const { data: pubData } = supabase.storage
              .from("course-materials")
              .getPublicUrl(videoFilePath);
            if (pubData?.publicUrl) setSignedUrl(pubData.publicUrl);
            else setErrorLoadingFile(true);
          }
        }
      } catch {
        if (!cancel) {
          const { data: pubData } = supabase.storage
            .from("course-materials")
            .getPublicUrl(videoFilePath);
          if (pubData?.publicUrl) setSignedUrl(pubData.publicUrl);
          else setErrorLoadingFile(true);
        }
      }
    }
    loadSigned();
    return () => {
      cancel = true;
    };
  }, [videoFilePath]);

  const hasFile = !!videoFilePath && !errorLoadingFile;
  const embed = !hasFile || !signedUrl ? toEmbedUrl(videoUrl ?? "") : "";

  if (hasFile && signedUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-elegant">
        <video
          ref={videoRef}
          src={signedUrl}
          controls
          controlsList="nodownload"
          playsInline
          className="aspect-video w-full"
          onError={() => setErrorLoadingFile(true)}
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
        <div className="flex aspect-video items-center justify-center text-muted-foreground p-6 text-center">
          Vídeo ainda não configurado ou indisponível.
        </div>
      )}
    </div>
  );
}
