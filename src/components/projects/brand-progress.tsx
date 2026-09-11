import { Check } from "lucide-react";
import type { BrandChecklistItem } from "@/lib/brand/completeness";
import { cn } from "@/lib/utils";

export function BrandProgress({
  items,
  done,
  total,
  percent,
}: {
  items: BrandChecklistItem[];
  done: number;
  total: number;
  percent: number;
}) {
  const complete = done === total && total > 0;

  return (
    <div className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-[linear-gradient(105deg,#e4efd2,#f3f6e6_62%,#fbf1e8)] p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-semibold tracking-[0.1em] text-[#54603f] uppercase">Merkprofiel</p>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-[26px] leading-none font-semibold tracking-[-0.04em]">
            {done} van {total}
          </p>
          <p className="mt-1.5 text-sm text-[#54603f]">
            {complete ? "Alles staat. Posts schrijven mee in deze stem." : "Vul de open punten in, of laat AI analyseren."}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold",
            complete ? "bg-[#4f8637] text-white" : "bg-white text-[#b8562c]"
          )}
        >
          {percent}%
        </span>
      </div>
      <div className="mt-4 h-[7px] overflow-hidden rounded-full bg-[rgb(31_27_24_/_10%)]">
        <span className="block h-full rounded-full bg-[#4f8637] transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-[13px]">
            <span
              className={cn(
                "flex size-[18px] items-center justify-center rounded-full",
                item.done ? "bg-[#4f8637] text-white" : "border border-[rgb(31_27_24_/_18%)] bg-white/70 text-transparent"
              )}
            >
              <Check className="size-3" />
            </span>
            <span className={item.done ? "text-[#3f6b2b]" : "text-[#635a52]"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
