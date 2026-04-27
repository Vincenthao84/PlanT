import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Package, Brain, Hand, Box, Key, MoreHorizontal,
  MapPin, MessageSquare, Award, CheckCircle2, Search,
  Shield, Users, Sparkles, ArrowRight, Quote
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
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

const flowSteps = [
  { n: "01", title: "Post a request", desc: "Set a location, boundary, reward and a short description. Keep it public or secret." },
  { n: "02", title: "Helpers bid", desc: "Nearby helpers see your request on the Notice Board or the What's Hot map and place a bid." },
  { n: "03", title: "Pick your helper", desc: "Compare bids, scores and messages. Award the one you trust." },
  { n: "04", title: "Chat & complete", desc: "Talk in the Dealing page. Release the reward and rate each other when it's done." },
];

const useCases = [
  "Check the length of a queue right now",
  "Snap a menu from across the city",
  "Save a seat at a popular restaurant",
  "Get neighbourhood intel before buying a home",
  "Investigate a workplace before accepting an offer",
  "Find a local Pui Yuet, carer or babysitter",
  "Rent out idle storage or a quiet corner",
  "Pick up and deliver a parcel cross-town",
  "Get fresh wedding, study-abroad or renovation tips",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            PLAN&nbsp;T
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#what" className="hover:text-foreground transition">What is it</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#uses" className="hover:text-foreground transition">Use cases</a>
          </div>
          <Button variant="default" className="rounded-full">Get early access</Button>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-soft)" }} />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 text-xs font-medium">
              A novel interactive platform
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Need a hand?
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Someone nearby can help.
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              PLAN T connects people who need something done — a snap of a queue, a quick errand,
              local know-how — with helpers right around the corner. Post a reward, pick a bidder,
              get it done.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="rounded-full text-base h-12 px-7" style={{ boxShadow: "var(--shadow-soft)" }}>
                I need help <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full text-base h-12 px-7">
                I can help
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-8 text-sm text-muted-foreground">
              <div><span className="text-2xl font-bold text-foreground">2M</span><span className="block text-xs">target users in 2 years</span></div>
              <div><span className="text-2xl font-bold text-foreground">10%</span><span className="block text-xs">flat service fee</span></div>
              <div><span className="text-2xl font-bold text-foreground">∞</span><span className="block text-xs">things you can ask for</span></div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl" style={{ background: "var(--gradient-hero)", opacity: 0.15, filter: "blur(40px)" }} />
            <img
              src={heroImg}
              alt="People helping each other through the PLAN T platform"
              width={1920}
              height={1080}
              className="relative rounded-3xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* WHAT */}
      <section id="what" className="py-24 max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">The idea</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">
            Have you ever needed a hand — urgently, remotely, anywhere?
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            You're willing to pay a small reward. Someone else would happily earn it.
            PLAN T is the mobile and web platform that brings you together, for any kind of task,
            sensitive to your location and your time.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            { icon: MapPin, t: "Location aware", d: "From a 100m radius around you to the entire country — set the boundary that fits the task." },
            { icon: Shield, t: "Public or secret", d: "Choose privacy. Secret deals stay sealed even after they're done." },
            { icon: Users, t: "Two-sided trust", d: "Scores, history and verified profiles on both sides of every deal." },
          ].map((f) => (
            <Card key={t(f.t)} className="p-8 border-border/60 hover:border-primary/40 transition-all hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0 0 0 / 0.05)" }}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-5">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{f.t}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{f.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* REQUEST TYPES */}
      <section className="py-24 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Request types</p>
              <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">Six ways to ask. Endless things to get done.</h2>
            </div>
            <p className="text-muted-foreground max-w-md">
              Every request is tagged so the right helpers see it first — and your reward goes to
              someone who actually fits the job.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {requestTypes.map((r) => (
              <Card key={r.label} className="p-7 bg-card border-border/60 group hover:border-accent/50 transition">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{r.label}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">From request to reward in four steps</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Three feature blocks */}
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
      </section>

      {/* MOCK NOTICE BOARD */}
      <section className="py-24 bg-gradient-to-b from-secondary/40 to-background">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Live preview</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">A glance at the Notice Board</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Every open request shows the location, type, privacy and reward.
              Helpers tap to bid, message privately, or share with a trusted group.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Snap", "Knowledge", "Courier", "Rental", "Action"].map((t) => (
                <Badge key={t} variant="outline" className="rounded-full">{t}</Badge>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-border/60 shadow-xl">
              <div className="px-6 py-4 bg-primary text-primary-foreground flex items-center justify-between">
                <span className="font-semibold">Notice Board</span>
                <span className="text-xs opacity-80">Sorted by importance</span>
              </div>
              <div className="divide-y divide-border">
                {[
                  { loc: "Tsim Sha Tsui", desc: "Check the queue at XX Shop right now", type: "Snap", priv: "Secret", r: "$6" },
                  { loc: "Central → Tsuen Wan", desc: "Pick up a parcel and deliver it", type: "Courier", priv: "Open", r: "$10" },
                  { loc: "Anywhere", desc: "Wholesale price of pork in your area", type: "Knowledge", priv: "Secret", r: "$100" },
                  { loc: "Causeway Bay", desc: "Save a table at the new ramen place", type: "Action", priv: "Open", r: "$8" },
                ].map((row) => (
                  <div key={row.desc} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/40 transition">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{row.desc}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> {row.loc}
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full text-xs">{row.type}</Badge>
                    <span className={`text-xs ${row.priv === "Secret" ? "text-accent" : "text-muted-foreground"}`}>{row.priv}</span>
                    <span className="font-bold text-primary w-12 text-right">{row.r}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="uses" className="py-24 max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Use cases</p>
          <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight">
            What will <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">you</em> ask for?
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((u, i) => (
            <div key={u} className="flex items-start gap-3 p-5 rounded-2xl bg-secondary/50 hover:bg-secondary transition">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm leading-relaxed">{u}</span>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST / SAFETY */}
      <section className="py-24 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Trust by design</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight">Built so both sides feel safe</h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Reward is locked the moment you confirm the request. Helpers bid with their reputation on
              the line. Either side can ask to cancel if anything feels off — and every completed deal
              feeds into a public score.
            </p>
            <ul className="mt-6 space-y-3">
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
          <Card className="p-8 border-border/60 bg-card">
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
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Sparkles className="h-3 w-3" />
            </span>
            PLAN T
          </div>
          <p>© {new Date().getFullYear()} PLAN T. A platform for offering & asking for help.</p>
        </div>
      </footer>
    </div>
  );
}

// helper to silence ts unused on key generation when needed
function t(s: string) { return s; }
