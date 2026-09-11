import { PlatformMark } from "@/components/posts/platform-mark";
import { PLATFORM_LABELS, type Platform } from "@/lib/platforms";
import { cn } from "@/lib/utils";

function withHashtags(content: string, hashtags: string[]): string {
  const tags = hashtags
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/^#+/, "")}`))
    .filter(Boolean);
  if (tags.length === 0) {
    return content;
  }
  const lower = content.toLowerCase();
  const missing = tags.filter((tag) => !lower.includes(tag.toLowerCase()));
  if (missing.length === 0) {
    return content;
  }
  return `${content.trim()}\n\n${missing.join(" ")}`;
}

function PreviewImage({ src, ratio }: { src: string; ratio: string }) {
  if (src) {
    return (
      <div className={cn("overflow-hidden bg-[#f5f5f4]", ratio)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="size-full object-cover" />
      </div>
    );
  }
  return <div className={cn("bg-linear-to-br from-[#fff1c2] via-[#ffd97a] to-[#f2b53c]", ratio)} />;
}

export function PlatformPreview({
  platform,
  content,
  title,
  projectName,
  projectSlug,
  scheduledLabel,
  imageUrl,
  hashtags,
}: {
  platform: Platform;
  content: string;
  title?: string | null;
  projectName: string;
  projectSlug: string;
  scheduledLabel: string;
  imageUrl: string;
  hashtags: string[];
}) {
  const body = content.trim() || "Nog geen tekst.";
  const igHandle = projectSlug.replace(/-/g, "") || projectName.toLowerCase().replace(/\s+/g, "");

  if (platform === "wordpress") {
    return (
      <article className="overflow-hidden rounded-[20px] border border-[rgb(31_27_24_/_8%)] bg-white">
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <PlatformMark platform="wordpress" size="lg" />
          <span>
            <span className="block text-sm font-semibold">{projectName}</span>
            <span className="block text-xs text-[#8b8079]">WordPress · artikel</span>
          </span>
        </div>
        <h3 className="px-4 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-[-0.03em]">
          {title || "Zonder titel"}
        </h3>
        <p className="mt-2 whitespace-pre-wrap px-4 pb-3 text-sm leading-[1.6] text-[#33302d]">{body}</p>
        <div className="mx-4 mb-3.5 overflow-hidden rounded-xl">
          <PreviewImage src={imageUrl} ratio="aspect-video" />
        </div>
      </article>
    );
  }

  if (platform === "instagram") {
    const caption = withHashtags(body, hashtags);
    const pieces = caption.split(/(#[\p{L}\p{N}_]+)/u);
    return (
      <article className="overflow-hidden rounded-[20px] border border-[rgb(31_27_24_/_8%)] bg-white">
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <PlatformMark platform="instagram" size="lg" />
          <span>
            <span className="block text-sm font-semibold">{igHandle}</span>
            <span className="block text-xs text-[#8b8079]">Instagram · feed</span>
          </span>
        </div>
        <PreviewImage src={imageUrl} ratio="aspect-square" />
        <p className="whitespace-pre-wrap px-4 py-3 pb-3.5 text-sm leading-[1.6] text-[#33302d]">
          <strong>{igHandle}</strong>{" "}
          {pieces.map((piece, index) =>
            piece.startsWith("#") ? (
              <span key={`${piece}-${index}`} className="text-[#0a66c2]">
                {piece}
              </span>
            ) : (
              piece
            )
          )}
        </p>
      </article>
    );
  }

  if (platform === "facebook") {
    return (
      <article className="overflow-hidden rounded-[20px] border border-[rgb(31_27_24_/_8%)] bg-white">
        <div className="flex items-center gap-2.5 px-4 py-3.5">
          <PlatformMark platform="facebook" size="lg" />
          <span>
            <span className="block text-sm font-semibold">{projectName}</span>
            <span className="block text-xs text-[#8b8079]">Facebook · pagina</span>
          </span>
        </div>
        <p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-[1.6] text-[#33302d]">{body}</p>
        <div className="mx-4 mb-3.5 overflow-hidden rounded-xl">
          <PreviewImage src={imageUrl} ratio="aspect-[1.91/1]" />
        </div>
        <div className="flex gap-[18px] border-t border-[rgb(31_27_24_/_7%)] px-4 py-2.5 text-[12.5px] font-semibold text-[#8b8079]">
          <span>Vind ik leuk</span>
          <span>Reageren</span>
          <span>Delen</span>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-[20px] border border-[rgb(31_27_24_/_8%)] bg-white">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <PlatformMark platform="linkedin" size="lg" />
        <span>
          <span className="block text-sm font-semibold">{projectName}</span>
          <span className="block text-xs text-[#8b8079]">
            {PLATFORM_LABELS[platform]} · {scheduledLabel}
          </span>
        </span>
        <span className="ml-auto rounded-full bg-[#e8f1fa] px-2.5 py-1 text-[11.5px] font-semibold text-[#0a66c2]">
          Bedrijfspagina
        </span>
      </div>
      <p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-[1.6] text-[#33302d]">{body}</p>
      <div className="mx-4 mb-3.5 overflow-hidden rounded-xl">
        <PreviewImage src={imageUrl} ratio="aspect-[1.91/1]" />
      </div>
      <div className="flex gap-[18px] border-t border-[rgb(31_27_24_/_7%)] px-4 py-2.5 text-[12.5px] font-semibold text-[#8b8079]">
        <span>Leuk</span>
        <span>Reageren</span>
        <span>Delen</span>
      </div>
    </article>
  );
}
