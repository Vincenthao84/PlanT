import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { getRequestType, createRequest } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/new/$type")({
  head: ({ params }) => {
    const t = getRequestType(params.type);
    const label = t?.label ?? "Request";
    return {
      meta: [
        { title: `Post a ${label} request — PLAN T` },
        { name: "description", content: `Describe your ${label.toLowerCase()} request and pin it on the map.` },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Unknown request type.</p>
        <Link to="/" className="text-primary underline">Back to request types</Link>
      </div>
    </div>
  ),
  component: NewRequestPage,
});

function NewRequestPage() {
  const params = Route.useParams();
  const type = getRequestType(params.type);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && !user) {
    navigate({ to: "/login" });
  }

  if (!type) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Unknown request type.</p>
          <Link to="/" className="text-primary underline">Back to request types</Link>
        </div>
      </div>
    );
  }

  const Icon = type.icon;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [reward, setReward] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!locationLabel) setLocationLabel("My current location");
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    let lat = coords?.lat;
    let lng = coords?.lng;

    // Geocode the typed location with the free OpenStreetMap Nominatim service
    if ((lat === undefined || lng === undefined) && locationLabel.trim()) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationLabel)}`,
          { headers: { "Accept-Language": "en" } },
        );
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data[0]) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch {
        /* ignore — fall back below */
      }
    }

    // Final fallback: city-center default so the map always renders
    if (lat === undefined || lng === undefined) {
      lat = 48.8566;
      lng = 2.3522;
    }

    try {
      const created = await createRequest({
        type: type.slug,
        title: title.trim(),
        description: description.trim(),
        locationLabel: locationLabel.trim() || "Pinned location",
        lat,
        lng,
        reward: reward.trim(),
      });
      navigate({ to: "/request/$id", params: { id: created.id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not post request";
      toast.error(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to request types
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Icon className="h-7 w-7" />
          </div>
          <div>
            <Badge variant="secondary" className="rounded-full mb-2">{type.label} request</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Tell helpers what you need</h1>
          </div>
        </div>

        <Card className="p-6 sm:p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g. ${exampleTitle(type.slug)}`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Details</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any context that will help nearby helpers fulfill the request."
                rows={4}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={locationLabel}
                  onChange={(e) => {
                    setLocationLabel(e.target.value);
                    setCoords(null);
                  }}
                  placeholder="Address, neighborhood or city"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={useMyLocation}
                  disabled={locating}
                >
                  {locating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MapPin className="h-3 w-3 mr-1" />}
                  Use my current location
                </Button>
                {coords && (
                  <p className="text-xs text-muted-foreground">
                    Pinned at {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward">Reward (optional)</Label>
                <Input
                  id="reward"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="e.g. €10"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" className="rounded-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Post request & view on map
              </Button>
            </div>
          </form>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}

function exampleTitle(slug: string): string {
  switch (slug) {
    case "snap": return "Photo of the queue at Café Loustic right now";
    case "knowledge": return "What's the neighborhood like at night?";
    case "action": return "Save me a seat at the 7pm screening";
    case "object": return "Pick up a package from the post office";
    case "rental": return "Rent a parking spot for Saturday";
    default: return "Describe what you need help with";
  }
}
