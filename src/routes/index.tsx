import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { requestTypes } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

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

// Clean, free OpenStreetMap reverse-geocoding helper function
async function getNeighborhoodName(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "User-Agent": "PlanT-Notice-Board-App",
        },
      }
    );
    const data = await response.json();
    const addr = data.address;
    
    // Fallback down the chain to find the most meaningful local place name
    return addr.suburb || addr.neighbourhood || addr.village || addr.quarter || addr.city_district || addr.city || "Nearby";
  } catch (error) {
    console.error("Failed to reverse geocode user coordinates:", error);
    return "Nearby";
  }
}

function Landing() {
  const { user, loading } = useAuth();
  const [localPlace, setLocalPlace] = useState<string | null>(null);

  // Detect user's current neighborhood dynamically on mount
  useEffect(() => {
    if (!user || !navigator.geolocation) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const placeName = await getNeighborhoodName(
          position.coords.latitude,
          position.coords.longitude
        );
        if (!cancelled) {
          setLocalPlace(placeName);
        }
      },
      (error) => {
        console.warn("Location lookup skipped or denied on Landing:", error);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [user]);

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
    <div className="min-h-screen bg-background text-foreground flex flex-col [contain:layout_style] [will-change:transform]">
      <SiteHeader />

      {/* HERO SECTION */}
      <section className="w-full bg-gradient-to-b from-emerald-50/60 via-slate-50/40 to-background block relative shrink-0">
        <div className="max-w-7xl mx-auto px-6 pt-12 pb-10 text-center">
          <img src="/plant-logo.png" alt="PlanT Logo"
            className="mx-auto mb-6 h-20 w-20 rounded-2xl shadow-md object-cover"
          />
          
          <div className="flex justify-center items-center gap-2 mb-4">
            <Badge variant="secondary" className="rounded-full px-4 py-1 text-xs font-medium">
              Six request types · One marketplace
            </Badge>
            {localPlace && (
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium border-emerald-500/30 bg-emerald-500/5 text-emerald-600 flex items-center gap-1 animate-in fade-in duration-300">
                <MapPin className="h-3 w-3 text-emerald-500" /> Live in: {localPlace}
              </Badge>
            )}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Small Price, Big Help from Community.
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Endless things to get done.
            </span>
          </h1>
          
          <p className="mt-3 text-lg font-medium text-foreground/80 max-w-3xl mx-auto">
            For instant help, remote or near, try to browse the Requests Notice Board below to offer help; or click the Requests Types Buttons to Ask for helps.
          </p>
          
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button
              size="lg"
              className="rounded-full text-sm h-11 px-6 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:opacity-90 transition-opacity"
              asChild
            >
              <Link to="/notice-board">
                Browse Requests <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* THE SIX REQUEST TYPES */}
      <section className="w-full block relative py-6 flex-1 bg-background z-10 [transform:translate3d(0,0,0)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="block sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 space-y-4 sm:space-y-0 w-full clear-both">
            {requestTypes.map((r) => (
              <Link
                key={r.slug}
                to="/new/$type"
                params={{ type: r.slug }}
                className="block w-full h-auto decoration-none focus:outline-none"
              >
                <Card
                  className="p-6 bg-card border border-border/80 rounded-xl block relative h-auto overflow-hidden [transform:translateZ(0)] [backface-visibility:hidden] [contain:content]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <r.icon className="h-6 w-6" />
                    </div>
                    
                    <div className="block static min-w-0 flex-1">
                      <h2 className="font-bold text-xl tracking-tight text-foreground block">{r.label}</h2>
                      <p className="mt-1.5 text-xs md:text-sm text-muted-foreground leading-relaxed block break-words whitespace-normal">
                        {r.desc}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary block">
                        Post a request <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground pb-12">
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

export default Landing;
