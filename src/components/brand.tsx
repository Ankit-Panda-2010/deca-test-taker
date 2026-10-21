import Link from "next/link";
import { Diamond } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Diamond className="size-4 fill-current" /></span>
      {!compact && <span>DECA Prep</span>}
    </Link>
  );
}
