"use client";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }
  return <Button type="button" variant="ghost" size="icon" onClick={toggle} aria-label="Toggle color theme"><Moon className="size-4 dark:hidden" /><Sun className="hidden size-4 dark:block" /></Button>;
}
