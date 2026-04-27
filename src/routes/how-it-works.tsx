import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, MapPin, MessageSquare, Award } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

const flowSteps = [
  { n: "01", title: "Post a request", desc: "Set a location, boundary, reward and a short description. Keep it public or secret." },
  { n: "02", title: "Helpers bid", desc: "Nearby helpers see your request on the Notice Board or the What's Hot map and place a bid." },
  { n: "03", title: "Pick your helper", desc: "Compare bids, scores and messages. Award the one you trust." },
  { n: "04", title: "Chat & complete", desc: "Talk in the Dealing page. Release the reward and rate each other when it's done." },
];

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How PLAN T works — Post, bid, award, complete" },
      { name: "description", content: "From request to reward in four steps. See how Notice Board, the What's Hot map and the Dealing page bring helpers and requesters together." },
      { property: "og:title", content: "How PLAN T works — Post, bid, award, complete" },
      { property: "og:description", content: "Four simple steps from posting a request to releasing the reward." },
    ],
  }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full mb-4">How it works</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">From request to reward in four steps</h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            PLAN T turns "I wish someone could help with this" into a quick, location-aware deal —
            without the awkwardness of asking a stranger in person.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {flowSteps.map((s, i) => (
            <div key={s.n} className="relative">
              <Card className="p-7 h-full border-border/60 hover:shadow-lg transition">
                <div className="text-5xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                  {s.n}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">{s.desc}</p>
              </Card>
              {i < flowSteps.length - 1 && (
                <ArrowRight className="hidden lg:block absolute top-1/2 -right-5 -translate-y-1/2 h-6 w-6 text-muted-foreground/40" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-20 grid lg:grid-cols-3 gap-6">
          <Card className="p-8 border-border/60">
            <Search className="h-7 w-7 text-primary mb-4" />
            <h3 className="text-xl font-semibold">Notice Board</h3>
            <p className="mt-2 text-muted-foreground">
              Helpers browse open requests sorted by importance — recency, reward and requester score.
              Set keyword alerts for jobs you'd love to take.
            </p>
          </Card>
          <Card className="p-8 border-border/60">
            <MapPin className="h-7 w-7 text-accent mb-4" />
            <h3 className="text-xl font-semibold">What's Hot Map</h3>
            <p className="mt-2 text-muted-foreground">
              See live requests around you on a map. Higher rewards and sponsored posts appear larger,
              so the most urgent help is impossible to miss.
            </p>
          </Card>
          <Card className="p-8 border-border/60">
            <MessageSquare className="h-7 w-7 text-primary mb-4" />
            <h3 className="text-xl font-semibold">Dealing Page</h3>
            <p className="mt-2 text-muted-foreground">
              Once a bid is awarded, both sides chat in private. Send photos, payment and rate the
              experience when the deal is done.
            </p>
          </Card>
        </div>

        <div className="mt-20 grid md:grid-cols-2 gap-12 items-start">
          <div>
            <Badge variant="secondary" className="rounded-full mb-4">Trust by design</Badge>
            <h2 className="text-3xl font-bold tracking-tight">Built so both sides feel safe</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Reward is locked the moment you confirm the request. Helpers bid with their reputation
              on the line. Either side can ask to cancel if anything feels off — and every completed
              deal feeds into a public score.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "10% service fee on public requests, 20% on secret",
              "Currency auto-converted at the prevailing FX rate",
              "Full deal history searchable on every profile",
              "Secret deals stay sealed — even after completion",
            ].map((p) => (
              <li key={p} className="flex items-start gap-3">
                <Award className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}