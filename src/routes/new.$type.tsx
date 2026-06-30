import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Loader2, EyeOff, Image as ImageIcon, X, Map } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { getRequestType, createRequest } from "@/lib/request-types";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  component: NewRequestPage,
});

async function fetchAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "User-Agent": "PlanT-Notice-Board-App" } }
    );
    const data = await response.json();
    const addr = data.address;
    if (!addr) return "Pinned location";
    return addr.suburb || addr.neighbourhood || addr.village || addr.quarter || addr.city_district || addr.city || "Pinned location";
  } catch (error) {
    console.error("Failed to reverse geocode inside form container:", error);
    return "Pinned location";
  }
}

function NewRequestPage() {
  const params = Route.useParams();
  const type = getRequestType(params.type);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && !user) {
    void navigate({ to: "/login" });
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
  const [isSecret, setIsSecret] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchingMap, setSearchingMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 📸 Media Storage Hooks
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        setCoords({ lat: currentLat, lng: currentLng });
        const calculatedAddress = await fetchAddressFromCoords(currentLat, currentLng);
        setLocationLabel(calculatedAddress);
        setLocating(false);
      },
      () => {
        toast.error("Location lookup timed out or access denied.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // 🗺️ Dynamic Preview Lookup Event Handler
  const handleShowMapLookup = async () => {
    if (!locationLabel.trim()) {
      toast.error("Please enter an address or region first before showing the map.");
      return;
    }
    setSearchingMap(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationLabel)}`,
        { headers: { "Accept-Language": "en", "User-Agent": "PlanT-Notice-Board-App" } },
      );
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data && data[0]) {
        setCoords({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
        toast.success("Location pinpointed on preview map!");
      } else {
        toast.error("Could not find coordinates for this address text. Try typing a broader neighborhood name.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during geocoding lookup.");
    } finally {
      setSearchingMap(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    let lat = coords?.lat;
    let lng = coords?.lng;

    if ((lat === undefined || lng === undefined) && locationLabel.trim()) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationLabel)}`,
          { headers: { "Accept-Language": "en", "User-Agent": "PlanT-Notice-Board-App" } },
        );
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data[0]) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch {
        /* ignore */
      }
    }

    if (lat === undefined || lng === undefined) {
      lat = 48.8566;
      lng = 2.3522;
    }

    try {
      const uploadedUrls: string[] = [];
      
      if (selectedFiles.length > 0) {
        setUploadingImages(true);
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const uniquePath = `request-attachments/${user?.id || 'anonymous'}/${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('task-photos') 
            .upload(uniquePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('task-photos') 
            .getPublicUrl(uniquePath);

          uploadedUrls.push(publicUrl);
        }
      }

      // ✅ FIXED: Changed 'images: uploadedUrls' to 'photoUrls: uploadedUrls' to match database mapping handler
      const created = await createRequest({
        type: type.slug,
        title: title.trim(),
        description: description.trim(),
        locationLabel: locationLabel.trim() || "Pinned location",
        lat,
        lng,
        reward: reward.trim(),
        isSecret,
        photoUrls: uploadedUrls, 
      });
      
      void navigate({ to: "/request/$id", params: { id: created.id } });
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Could not post request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const mapEmbedUrl = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005}%2C${coords.lat - 0.003}%2C${coords.lng + 0.005}%2C${coords.lat + 0.003}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`
    : null;

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

            {/* 📸 IMAGE ATTACHMENT BOX BLOCK */}
            <div className="space-y-2">
              <Label>Attach Photos Reference (Optional)</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex flex-col items-center justify-center w-28 h-24 border border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors border-border/80">
                  <div className="flex flex-col items-center justify-center pt-3 text-muted-foreground">
                    <ImageIcon className="h-5 w-5 mb-1" />
                    <span className="text-[11px] font-medium">Add Photo</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </label>

                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="relative w-28 h-24 rounded-xl overflow-hidden border bg-muted group animate-in fade-in zoom-in-95 duration-150">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Local Upload Preview Thumbnail" 
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Map Placement Layout Split Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="flex gap-2">
                  <Input
                    id="location"
                    value={locationLabel}
                    onChange={(e) => {
                      setLocationLabel(e.target.value);
                      setCoords(null);
                    }}
                    placeholder="Address, neighborhood or city"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0 gap-1 rounded-xl text-xs h-10 px-3"
                    onClick={handleShowMapLookup}
                    disabled={searchingMap || locating}
                  >
                    {searchingMap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Map className="h-3.5 w-3.5" />}
                    Show Map
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={useMyLocation}
                    disabled={locating || searchingMap}
                  >
                    {locating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MapPin className="h-3 w-3 mr-1" />}
                    Use my current location
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground pt-1">
                  Please type in the exact address including name of the street, district and country/region.
                </p>
                {coords && (
                  <p className="text-[11px] text-muted-foreground font-mono bg-muted/40 p-1.5 rounded-lg inline-block">
                    Coordinates Locked: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </p>
                )}
              </div>

              {/* Real-time map preview box next to inputs */}
              <div className="space-y-2">
                <Label>Map Pin Preview</Label>
                <Card className="aspect-video w-full rounded-2xl border bg-muted/10 overflow-hidden relative flex items-center justify-center min-h-[140px]">
                  {mapEmbedUrl ? (
                    <iframe
                      title="New Request Realtime Map Preview"
                      width="100%"
                      height="100%"
                      className="border-none absolute inset-0"
                      src={mapEmbedUrl}
                    />
                  ) : (
                    <div className="text-center p-4 text-xs text-muted-foreground max-w-[200px] space-y-1">
                      <MapPin className="h-5 w-5 mx-auto opacity-30 text-muted-foreground mb-1" />
                      <p>Type an address and click <strong className="text-foreground/80">"Show Map"</strong> to view layout verification pin layout.</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward">Reward (optional)</Label>
              <Input
                id="reward"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="e.g. €10"
                className="max-w-xs"
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
              <div className="space-y-1">
                <Label htmlFor="secret" className="flex items-center gap-2 cursor-pointer">
                  <EyeOff className="h-4 w-4 text-muted-foreground" /> Secret Request
                </Label>
                <p className="text-xs text-muted-foreground">
                  Hide your username on the notice board. Helpers will see "Secret Request" instead.
                </p>
              </div>
              <Switch id="secret" checked={isSecret} onCheckedChange={setIsSecret} />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" className="rounded-full" disabled={submitting || uploadingImages}>
                {(submitting || uploadingImages) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {uploadingImages ? "Uploading Media..." : "Post request & view on map"}
              </Button>
            </div>
          </form>
        </Card>
      </section>
      <SiteFooter />
    </div>
  );
}
