import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { requestTypes } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PLAN T — Small Price, Big Help from Community. Endless things to get done." },
      { name: "description", content: "Snap, Knowledge, Action, Object, Rental or Anything — pick the type of help you need and let nearby helpers bid on your request." },
      { property: "og:title", content: "PLAN T — Small Price, Big Help from Community. Endless things to get done." },
      { property: "og:description", content: "Six request types, one location-aware help marketplace." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col isolation-auto [@supports(isolation:isolate)]:isolate">
      <SiteHeader />

      {/* HERO — six request types front and center */}
      <section className="relative overflow-hidden shrink-0">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-soft)" }} />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12 text-center">
          <img src="/plant-logo.png" alt="PlanT Logo"
            className="mx-auto mb-6 h-24 w-24 md:h-32 md:w-32 rounded-3xl shadow-lg object-cover"
          />
          <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 text-xs font-medium">
            Six request types · One marketplace
          </Badge>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            Small Price, Big Help from Community.
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Endless things to get done.
            </span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl font-medium text-foreground/80">
            For instant help, remote or near.
          </p>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Every request on PLAN T is tagged so the right helpers see it first — and your reward
            goes to someone who actually fits the job. Pick a type to start.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button
              size="lg"
              className="rounded-full text-base h-12 px-7 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:opacity-90"
              asChild
            >
              <Link to="/notice-board">
                Browse the Requests Notice Board <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full text-base h-12 px-7" asChild>
              <Link to="/how-it-works">See how it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* THE SIX REQUEST TYPES — main content */}
      <section className="pb-24 flex-1 block clear-both relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          {/* Modified Container Grid: Replaced standard Tailwind gap with individual block margins 
              and applied explicit webview safety containment classes */}
          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-y-6 sm:gap-6 w-full clear-both pointer-events-auto">
            {requestTypes.map((r) => (
              <Link
                key={r.slug}
                to="/new/$type"
                params={{ type: r.slug }}
                className="block w-full clear-both focus:outline-none focus:ring-2 focus:ring-ring rounded-xl h-auto overflow-hidden relative"
              >
                {/* Removed -translate-y animations on mobile viewports to stabilize Android WebView layer engines */}
                <Card
                  className="p-8 bg-card border-border/60 group active:border-accent/50 md:hover:border-accent/50 md:hover:-translate-y-1 transition-all h-auto min-h-[160px] overflow-hidden block relative"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <div className="flex items-start gap-5">
                    <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition">
                      <r.icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-2xl tracking-tight text-foreground">{r.label}</h2>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed overflow-wrap-break-word whitespace-normal">{r.desc}</p>
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
