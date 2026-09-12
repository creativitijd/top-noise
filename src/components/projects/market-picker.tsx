"use client";

import { BE_REGIONS, COUNTRY_META, MARKET_COUNTRIES, REGION_META, type BeRegion, type MarketCountry } from "@/lib/holidays";
import { cn } from "@/lib/utils";

export function MarketPicker({
  country,
  region,
  onChange,
}: {
  country: MarketCountry;
  region: BeRegion | null;
  onChange: (next: { country: MarketCountry; region: BeRegion | null; timezone: string }) => void;
}) {
  function setCountry(next: MarketCountry) {
    onChange({
      country: next,
      region: next === "BE" ? region ?? "VLG" : null,
      timezone: COUNTRY_META[next].timezone,
    });
  }

  function setRegion(next: BeRegion) {
    onChange({
      country,
      region: next,
      timezone: COUNTRY_META[country].timezone,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {MARKET_COUNTRIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCountry(item)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              country === item ? "bg-[#1f1b18] text-white" : "bg-white text-[#635a52] ring-1 ring-[rgb(31_27_24_/_10%)]"
            )}
          >
            {COUNTRY_META[item].label}
          </button>
        ))}
      </div>
      {country === "BE" ? (
        <div className="flex flex-wrap gap-2">
          {BE_REGIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRegion(item)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] font-semibold",
                region === item ? "bg-[#4f8637] text-white" : "bg-white text-[#635a52] ring-1 ring-[rgb(31_27_24_/_10%)]"
              )}
            >
              {REGION_META[item].label}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-[12.5px] text-[#8b8079]">
        Bepaalt feestdagen in Automaat en de kalender. Tijdzone: {COUNTRY_META[country].timezone}.
      </p>
    </div>
  );
}
