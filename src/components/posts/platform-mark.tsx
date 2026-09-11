import type { Platform } from "@/lib/platforms";
import { cn } from "@/lib/utils";

export function PlatformMark({
  platform,
  size = "md",
}: {
  platform: Platform;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "sm" ? "size-7 rounded-[9px]" : size === "lg" ? "size-[38px] rounded-full" : "size-[34px] rounded-[11px]";
  const type = size === "lg" ? "text-[19px]" : "text-[14px]";

  if (platform === "linkedin") {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center bg-[#0a66c2] font-bold text-white", box, type)}>
        in
      </span>
    );
  }
  if (platform === "facebook") {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center bg-[#1877f2] font-bold text-white", box, size === "lg" ? "text-[19px]" : "text-[17px]")}>
        f
      </span>
    );
  }
  if (platform === "wordpress") {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center bg-[#5b4fa8] font-bold text-white", box, type)}>
        wp
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-linear-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white",
        box
      )}
    >
      <svg width={size === "sm" ? 15 : 19} height={size === "sm" ? 15 : 19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" />
      </svg>
    </span>
  );
}
