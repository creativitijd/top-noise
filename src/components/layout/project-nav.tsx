"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "", label: "Kalender" },
  { href: "/analytics", label: "Resultaten" },
  { href: "/channels", label: "Kanalen" },
  { href: "/settings", label: "Merk" },
];

export function ProjectNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((link) => {
        const href = `/projects/${slug}${link.href}`;
        const active =
          link.href === ""
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
