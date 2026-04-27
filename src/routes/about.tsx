import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Shield, Users, Quote } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About PLAN T — A platform that belongs to its users" },
      { name: "description", content: "PLAN T is a location-aware help marketplace built on trust, privacy and shared rewards." },
      { property: "og:title", content: "About PLAN T — A platform that belongs to its users" },
      { property: "og:description", content: "The story, the values and the trust model behind PLAN T." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full mb-4">About</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Have you ever needed a hand — urgently, remotely, anywhere?
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            You're willing to pay a small reward. Someone else would happily earn it. PLAN T is the
            mobile and web platform that brings you together, for any kind of task, sensitive to
            your location and your time.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {[
            { icon: MapPin, t: "Location aware", d: "From a 100m radius around you to the entire country — set the boundary that fits the task." },
            { icon: Shield, t: "Public or secret", d: "Choose privacy. Secret deals stay sealed even after they're done." },
            { icon: Users, t: "Two-sided trust", d: "Scores, history and verified profiles on both sides of every deal." },
          ].map((f) => (
            <Card key={f.t} className="p-8 border-border/60 hover:border-primary/40 transition-all hover:-translate-y-1">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{f.d}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-16 p-10 border-border/60 bg-card max-w-3xl">
          <Quote className="h-8 w-8 text-primary/30" />
          <p className="mt-4 text-xl leading-relaxed">
            "We came up with PLAN T from a dream and a desire to help people.
            The platform should belong to everyone who uses it."
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent" />
            <div>
              <div className="font-semibold text-sm">The PLAN T team</div>
              <div className="text-xs text-muted-foreground">Founders</div>
            </div>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}