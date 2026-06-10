import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Locate } from "lucide-react";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";

// Production Safe Pin System using native Inline Styles
// This bypasses Tailwind scanning issues on Vercel completely
function createProductionIcon(slug: string): L.DivIcon {
  // Map slugs to precise OKLCH color strings matching your styles.css theme
  const colorMap: Record<string, string> = {
    snap: "oklch(0.60 0.25 25)",
    knowledge: "oklch(0.62 0.13 195)",
    action: "oklch(0.65 0.18 150)",
    object: "oklch(0.75 0.15 75)",
    rental: "oklch(0.55 0.22 290)",
    anything: "oklch(0.50 0.02 200)",
  };

  const pinBgColor = colorMap[slug] || "oklch(0.50 0.02 200)";
  const shortText = slug ? slug.substring(0, 2).toUpperCase() : "RQ";

  const html = `
    <div style="position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center;">
      <div style="width:36px; height:36px; border-radius:50%; background:${pinBgColor}; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-family:sans-serif; font-size:11px; font-weight:700; letter-spacing:-0.5px;">
        ${shortText}
      </div>
      <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid white; margin-top:-2px;"></div>
    </div>`;

  return L.divIcon({
    className: "leaflet-custom-pin-reset", // Simple clean wrapper
    html,
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  });
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Controls recentering and fixes rendering tile gaps aggressively
function MapController({ center, zoom, requestsCount }: { center: [number, number] | null; zoom?: number; requestsCount: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom ?? 13, { duration: 0.8 });
    }
  }, [center, zoom, map]);

  // Forces map sizes to re-calculate, repairing broken/missing tiles on mobile viewport changes
  useEffect(() => {
    const fixLayout = () => map.invalidateSize();
    fixLayout();
    const interval = setInterval(fixLayout, 300);
    const timer = setTimeout(() => clearInterval(interval), 1500);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [map, requestsCount]);

  return null;
}

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const [mounted, setMounted] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const requested = useRef(false);

  // Critical Protection: Stops Leaflet from touching global browser APIs before mount
  useEffect(() => {
    setMounted(true);
    
    // Safely assign default marker fallbacks only when window context exists
    const DefaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = DefaultIcon;
  }, []);

  const requestLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setFlyTarget([loc.lat, loc.lng]);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  useEffect(() => {
    if (mounted && !requested.current) {
      requested.current = true;
      requestLocation();
    }
  }, [mounted]);

  const center: [number, number] = useMemo(() => {
    if (userLoc) return [userLoc.lat, userLoc.lng];
    if (requests && requests.length > 0) return [requests[0].lat, requests[0].lng];
    return [22.3193, 114.1694];
  }, [userLoc, requests]);

  const sorted = useMemo<StoredRequest[]>(() => {
    if (!requests) return [];
    if (!userLoc) return requests;
    return [...requests]
      .map((r) => ({ r, d: haversineKm(userLoc, { lat: r.lat, lng: r.lng }) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.r);
  }, [requests, userLoc]);

  // Safe fallback while the container initializes on modern cell phones
  if (!mounted) {
    return (
      <div className="w-full h-[480px] rounded-xl bg-muted flex items-center justify-center text-sm text-muted-foreground animate-pulse border">
        Initializing map parameters…
      </div>
    );
  }

  // User position pin fallback setup
  const userIcon = L.divIcon({
    className: "leaflet-custom-user-reset",
    html: `<div style="width:18px; height:18px; border-radius:50%; background:#2563eb; border:3px solid white; box-shadow:0 0 0 2px rgba(0,0,0,0.25)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  return (
    <div className="relative w-full h-[480px] rounded-xl overflow-hidden border bg-muted">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="w-full h-full z-10">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={flyTarget} requestsCount={sorted.length} />
        
        {userLoc && (
          <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        
        {sorted.map((r) => {
          const t = getRequestType(r.type);
          const dist = userLoc ? haversineKm(userLoc, { lat: r.lat, lng: r.lng }) : null;
          
          return (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={createProductionIcon(r.type)}>
              <Popup>
                <div className="space-y-1 min-w-[180px] text-foreground">
                  <div className="text-xs text-muted-foreground font-medium">{t?.label ?? "Request"}</div>
                  <div className="font-semibold text-sm leading-tight">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.locationLabel}</div>
                  {dist !== null && (
                    <div className="text-xs font-medium text-primary">
                      {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`} away
                    </div>
                  )}
                  <div className="pt-1">
                    <Link
                      to="/request/$id"
                      params={{ id: r.id }}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      View details &rarr;
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <div className="absolute top-3 right-3 z-[500]">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full shadow-md border bg-background font-medium text-xs"
          onClick={requestLocation}
          disabled={locating}
        >
          <Locate className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
          {locating ? "Locating…" : userLoc ? "Recenter" : "Use my location"}
        </Button>
      </div>
    </div>
  );
}

export default RequestsMap;
