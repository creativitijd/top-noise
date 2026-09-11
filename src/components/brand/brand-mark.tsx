import Image from "next/image";
import Link from "next/link";

export function BrandMark({
  href = "/",
  size = 40,
  light = false,
}: {
  href?: string;
  size?: number;
  light?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <Image
        src="/logo.jpg"
        alt="Top Noise"
        width={size}
        height={size}
        className="rounded-md object-contain"
        priority
      />
      <span className={`text-xl font-black tracking-tight ${light ? "text-white" : "text-foreground"}`}>
        Top Noise
      </span>
    </Link>
  );
}
