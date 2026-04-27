import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Package, Brain, Hand, Box, Key, MoreHorizontal,
  MapPin, MessageSquare, Award, CheckCircle2, Search,
  Shield, Users, Sparkles, ArrowRight, Quote
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

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

const requestTypes = [
  { icon: Camera, label: "Snap", desc: "Instant photo or video of a place — check a queue, see a menu, confirm hours." },
  { icon: Brain, label: "Knowledge", desc: "Local intel before you buy a home, switch jobs, or move abroad." },
  { icon: Hand, label: "Action", desc: "Save a table, take a queue ticket, drop off a message." },
  { icon: Package, label: "Object", desc: "Trade, deliver or pick up something nearby." },
  { icon: Key, label: "Rental", desc: "Rent out an idle storage corner, a parking spot or a tool." },
  { icon: MoreHorizontal, label: "Anything", desc: "If someone can help with it, you can post it on PLAN T." },
];

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
            <Button size="lg" className="rounded-full text-base h-12 px-7" style={{ boxShadow: "var(--shadow-soft)" }}>
              Post a request <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
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
              <Card
                key={r.label}
                className="p-8 bg-card border-border/60 group hover:border-accent/50 hover:-translate-y-1 transition-all"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                <div className="flex items-start gap-5">
                  <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition">
                    <r.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-2xl tracking-tight">{r.label}</h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              </Card>
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
