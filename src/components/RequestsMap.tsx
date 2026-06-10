import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Locate } from "lucide-react";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

// Fix default marker asset fallbacks securely for production build pipelines
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

// Production Safe Marker Builder: Generated per render frame to prevent asset timing lag
function createProductionTypeIcon(slug: string): L.DivIcon {
  const t = getRequestType(slug);
  const Icon = t?.icon;
  
  const svg = Icon
    ? renderToStaticMarkup(
        createElement(Icon, { size: 18, color: "white", strokeWidth: 2.5 }),
      )
    : "";

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="width:36px;height:36px;border-radius:9999px;background:#dc2626;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;">
        ${svg}
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid white;margin-top:-2px;"></div>
    </div>`;

  return L.divIcon({
    className: "custom-production-pin",
    html,
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  });
}

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:hsl(var(--primary,220 90% 56%));border:3px solid white;box-shadow:0 0 0 2px rgba(0,0,0,0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Fixed Sizing Observer & Fly To Actions
function MapController({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom ?? 13, { duration: 0.8 });
    }
  }, [center, zoom, map]);

  // Fixes the puzzle piece tiling glitch right when the container renders
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const requested = useRef(false);

  const requestLocation = () => {
    if (!("geolocation" in navigator)) return;
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
    if (requested.current) return;
    requested.current = true;
    requestLocation();
  }, []);

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

  return (
    <div className="relative w-full h-full min-h-[350px]">
      <MapContainer center={center} zoom={13} scrollWheelZoom className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={flyTarget} />
        
        {userLoc && (
          <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        
        {sorted.map((r) => {
          const t = getRequestType(r.type);
          const dist = userLoc ? haversineKm(userLoc, { lat: r.lat, lng: r.lng }) : null;
          
          // Generate build-safe instances dynamically right here
          const dynamicIcon = createProductionTypeIcon(r.type);

          return (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={dynamicIcon}>
              <Popup>
                <div className="space-y-1 min-w-[180px]">
                  <div className="text-xs text-muted-foreground">{t?.label ?? "Request"}</div>
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-xs">{r.locationLabel}</div>
                  {dist !== null && (
                    <div className="text-xs text-muted-foreground">
                      {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`} away
                    </div>
                  )}
                  <Link
                    to="/request/$id"
                    params={{ id: r.id }}
                    className="text-primary underline text-xs"
                  >
                    View details
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      <div className="absolute top-3 right-3 z-[400]">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full shadow"
          onClick={requestLocation}
          disabled={locating}
        >
          <Locate className="h-4 w-4 mr-1" />
          {locating ? "Locating…" : userLoc ? "Recenter" : "Use my location"}
        </Button>
      </div>
    </div>
  );
}

export default RequestsMap;
