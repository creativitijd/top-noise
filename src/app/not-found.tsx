import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl">Pagina niet gevonden</h1>
      <p className="text-muted-foreground">Dit pad bestaat niet op Top Noise.</p>
      <Link href="/" className={buttonVariants()}>
        Naar home
      </Link>
    </main>
  );
}
