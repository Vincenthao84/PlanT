import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MapPin } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

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

const noticeBoard = [
  { loc: "Tsim Sha Tsui", desc: "Check the queue at XX Shop right now", type: "Snap", priv: "Secret", r: "$6" },
  { loc: "Central → Tsuen Wan", desc: "Pick up a parcel and deliver it", type: "Courier", priv: "Open", r: "$10" },
  { loc: "Anywhere", desc: "Wholesale price of pork in your area", type: "Knowledge", priv: "Secret", r: "$100" },
  { loc: "Causeway Bay", desc: "Save a table at the new ramen place", type: "Action", priv: "Open", r: "$8" },
];

export const Route = createFileRoute("/use-cases")({
  head: () => ({
    meta: [
      { title: "Use cases — What you can ask for on PLAN T" },
      { name: "description", content: "From queue checks to neighbourhood intel and idle-storage rentals — see the kinds of help people post on PLAN T." },
      { property: "og:title", content: "Use cases — What you can ask for on PLAN T" },
      { property: "og:description", content: "Real examples of requests people post on PLAN T every day." },
    ],
  }),
  component: UseCasesPage,
});

function UseCasesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full mb-4">Use cases</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            What will <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">you</em> ask for?
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            A small reward unlocks a surprising amount of help. Here are some of the things PLAN T
            users post every day.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {useCases.map((u) => (
            <div key={u} className="flex items-start gap-3 p-5 rounded-2xl bg-secondary/50 hover:bg-secondary transition">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm leading-relaxed">{u}</span>
            </div>
          ))}
        </div>

        <div className="mt-20 grid lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Live preview</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">A glance at the Notice Board</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
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
                {noticeBoard.map((row) => (
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

      <SiteFooter />
    </div>
  );
}