import Image from "next/image";
import Link from "next/link";

export function BrandMark({
  href = "/",
  size = 32,
  light = false,
}: {
  href?: string;
  size?: number;
  light?: boolean;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center overflow-hidden rounded-[10px] border border-[rgb(31_27_24_/_8%)] bg-white">
        <Image
          src="/logo.jpg"
          alt="Top Noise"
          width={size}
          height={size}
          className="size-7 object-cover mix-blend-multiply"
          priority
        />
      </span>
      <span
        className={`font-[family-name:var(--font-heading)] text-[19px] font-bold tracking-[-0.03em] ${
          light ? "text-white" : "text-foreground"
        }`}
      >
        Top Noise
      </span>
    </Link>
  );
}
