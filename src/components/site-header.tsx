import Link from "next/link";
import { BookOpen, HardDrive, LayoutDashboard, Settings, Upload } from "lucide-react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Brand />
        <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm"><Link href="/dashboard"><LayoutDashboard className="size-4" />Dashboard</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/library"><BookOpen className="size-4" />Library</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href="/upload"><Upload className="size-4" />Upload</Link></Button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 sm:flex dark:text-emerald-300"><HardDrive className="size-3.5" />Saved locally</span>
          <ThemeToggle />
          <Button asChild variant="ghost" size="icon"><Link href="/settings" aria-label="Local settings"><Settings className="size-4" /></Link></Button>
        </div>
      </div>
    </header>
  );
}
