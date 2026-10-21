import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, FileCheck2, LockKeyhole, ScanText, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  [ScanText, "Upload", "Drop in a PDF you’re permitted to use."],
  [FileCheck2, "Verify", "See exactly what DECA signals were found."],
  [CheckCircle2, "Review", "Resolve uncertain text or missing keys."],
  [BarChart3, "Practice", "Study, score, and track your weak areas."],
] as const;

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:py-28">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary"><Sparkles className="size-4" />Built for DECA competitors</div>
              <h1 className="max-w-3xl text-5xl font-bold leading-[1.04] tracking-[-.045em] sm:text-6xl">Your practice PDF, rebuilt for better practice.</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Upload a DECA-style exam. DECA Prep separates questions from the descriptive key, flags uncertainty, and turns the result into a private, interactive study session.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link href="/upload">Convert an exam <ArrowRight className="size-4" /></Link></Button><Button asChild variant="outline" size="lg"><Link href="#how-it-works">See how it works</Link></Button></div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-2"><LockKeyhole className="size-4 text-primary" />No account needed</span><span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Saved on this device</span><span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />Deterministic grading</span></div>
            </div>
            <Card className="relative overflow-hidden border-primary/15 bg-card p-3 shadow-[0_24px_80px_rgba(24,32,51,.10)]">
              <div className="rounded-xl bg-[#17213a] p-5 text-white">
                <div className="flex items-center justify-between text-xs text-white/60"><span>MARKETING CLUSTER · PRACTICE</span><span>Question 42 of 100</span></div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[42%] rounded-full bg-[#ef526c]" /></div>
              </div>
              <CardContent className="p-7">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Performance indicator · CO:031</p>
                <h2 className="mt-3 text-xl font-semibold leading-7">When writing a persuasive business message, what should you prioritize?</h2>
                <div className="mt-6 grid gap-3">
                  {["A · Personal goals", "B · An opening quotation", "C · Minor details first", "D · Benefits to the audience"].map((choice, index) => <div key={choice} className={`rounded-xl border p-4 text-sm ${index === 3 ? "border-emerald-500 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200" : "bg-background"}`}>{choice}</div>)}
                </div>
                <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-4 text-sm"><strong className="text-emerald-800 dark:text-emerald-200">Correct.</strong><span className="ml-2 text-muted-foreground">The audience is more likely to respond when the benefit is clear.</span></div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary">From file to focus</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Transparent at every step.</h2><p className="mt-4 text-muted-foreground">The app never quietly guesses a missing answer. You see what was found, what is uncertain, and what came from the source.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-4">{steps.map(([Icon, title, body], index) => <Card key={title}><CardContent className="p-6"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><span className="font-mono text-xs text-muted-foreground">0{index + 1}</span></div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></CardContent></Card>)}</div>
        </section>
      </main>
      <footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6"><p>DECA Prep is an independent study tool and is not affiliated with DECA Inc.</p><p>Upload only material you’re permitted to use.</p></div></footer>
    </div>
  );
}
