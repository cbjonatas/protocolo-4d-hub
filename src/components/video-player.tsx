import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type EmbedResult =
  | { type: "direct"; url: string }
  | { type: "iframe"; url: string }
  | { type: "none"; url: "" };

function parseVideoUrl(url?: string): EmbedResult {
  if (!url || !url.trim()) return { type: "none", url: "" };
  const cleaned = url.trim();

  // Direct MP4 / WEBM / MOV video file URL
  if (/\.(mp4|webm|m4v|mov)(\?.*)?$/i.test(cleaned)) {
    return { type: "direct", url: cleaned };
  }

  // YouTube format 1: watch?v=ID, youtu.be/ID, embed/ID, shorts/ID, live/ID
  const ytMatch = cleaned.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: "iframe",
      url: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&autoplay=0`,
    };
  }

  // YouTube format 2: fallback for any 11-character video ID in v= query string
  const ytAny = cleaned.match(/(?:v=|v\/|\/v\/)([\w-]{11})/);
  if (ytAny && ytAny[1]) {
    return {
      type: "iframe",
      url: `https://www.youtube.com/embed/${ytAny[1]}?rel=0&modestbranding=1&autoplay=0`,
    };
  }

  // Vimeo
  const vim = cleaned.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vim && vim[1]) {
    return { type: "iframe", url: `https://player.vimeo.com/video/${vim[1]}` };
  }

  // Google Drive
  const drive = cleaned.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (drive && drive[1]) {
    return { type: "iframe", url: `https://drive.google.com/file/d/${drive[1]}/preview` };
  }

  // Loom
  const loom = cleaned.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (loom && loom[1]) {
    return { type: "iframe", url: `https://www.loom.com/embed/${loom[1]}` };
  }

  // Fallback for custom embedded players or URLs
  return { type: "iframe", url: cleaned };
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
      if (!videoFilePath || !videoFilePath.trim()) {
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

  const hasFile = !!videoFilePath && videoFilePath.trim() !== "" && !errorLoadingFile;

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

  const embed = parseVideoUrl(videoUrl);

  if (embed.type === "direct") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-elegant">
        <video
          ref={videoRef}
          src={embed.url}
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
      </div>
    );
  }

  if (embed.type === "iframe" && embed.url) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-elegant">
        <div className="aspect-video">
          <iframe
            src={embed.url}
            title={title ?? "Vídeo"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-elegant">
      <div className="flex aspect-video items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Nenhum vídeo configurado para esta aula. Acesse o Painel do Administrador para cadastrar a URL ou arquivo de vídeo.
      </div>
    </div>
  );
}
