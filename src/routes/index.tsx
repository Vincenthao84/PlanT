import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { requestTypes } from "@/lib/request-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PLAN T — Six ways to ask. Endless things to get done." },
      { name: "description", content: "Snap, Knowledge, Action, Object, Rental or Anything — pick the type of help you need and let nearby helpers bid on your request." },
      { property: "og:title", content: "PLAN T — Six ways to ask. Endless things to get done." },
      { property: "og:description", content: "Six request types, one location-aware help marketplace." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* HERO — six request types front and center */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-soft)" }} />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 text-center">
          <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 text-xs font-medium">
            Six request types · One marketplace
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            Six ways to ask.
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Endless things to get done.
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Every request on PLAN T is tagged so the right helpers see it first — and your reward
            goes to someone who actually fits the job. Pick a type to start.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button size="lg" variant="outline" className="rounded-full text-base h-12 px-7" asChild>
              <Link to="/how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* THE SIX REQUEST TYPES — main content */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {requestTypes.map((r) => (
              <Link
                key={r.slug}
                to="/new/$type"
                params={{ type: r.slug }}
                className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-xl"
              >
                <Card
                  className="p-8 bg-card border-border/60 group hover:border-accent/50 hover:-translate-y-1 transition-all h-full"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div className="flex items-start gap-5">
                    <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition">
                      <r.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-2xl tracking-tight">{r.label}</h2>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                        Post a {r.label.toLowerCase()} request <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Want to see real examples?</span>
            <Link to="/use-cases" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              Browse use cases <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
