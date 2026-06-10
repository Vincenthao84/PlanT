import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";

const colorMap: Record<string, string> = {
  snap: "#ef4444",
  knowledge: "#3b82f6",
  action: "#10b981",
  object: "#f59e0b",
  rental: "#8b5cf6",
  anything: "#6b7280",
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [locating, setLocating] = useState(false);

  // 1. Initialize Map Canvas
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const defaultCenter: [number, number] = requests && requests.length > 0
      ? [requests[0].lng, requests[0].lat]
      : [114.1694, 22.3193]; // Hong Kong Default

    // Initialize the engine map viewport
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      // ✅ SECURE BRIGHT VECTOR STYLE (Works perfectly over production HTTPS)
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [
          {
            id: "osm-tiles-layer",
            type: "raster",
            source: "osm-tiles",
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: defaultCenter,
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      mapInstanceRef.current = map;
      setIsLoaded(true);
      // Force an immediate layout recalculation to ensure the map fills the whole box
      setTimeout(() => {
        map.resize();
      }, 100);
    });

    return () => {
      map.remove();
    };
  }, []);

  // 2. Track user geolocation viewport
  const requestLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    setLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstanceRef.current?.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          essential: true
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Trigger initial geolocation load once ready
  useEffect(() => {
    if (isLoaded) {
      requestLocation();
    }
  }, [isLoaded]);

  // 3. Render Custom Markers dynamically via DOM elements
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // Clear old markers from viewport mapping
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    requests.forEach((r) => {
      const t = getRequestType(r.type);
      const hexColor = colorMap[r.type] || "#6b7280";
      const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

      // Create HTML Pin Element
      const el = document.createElement("div");
      el.className = "custom-marker-pin";
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.cursor = "pointer";
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3)); display: block;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${hexColor}" stroke="#ffffff" stroke-width="1.5"/>
          <text x="12" y="11" fill="#ffffff" font-size="8px" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">${shortLabel}</text>
        </svg>
      `;

      // Build popup description details card structure
      const popupContent = `
        <div style="padding: 4px; font-family: system-ui, sans-serif; width: 170px; color: #1e293b;">
          <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">${t?.label ?? "Request"}</div>
          <div style="font-size: 13px; font-weight: 700; margin: 2px 0; line-height: 1.2;">${r.title}</div>
          <div style="font-size: 11px; color: #475569;">📍 ${r.locationLabel}</div>
          <div style="font-size: 11px; font-weight: 600; color: #10b981; margin-top: 2px;">💰 Suggested: ${r.reward || "None"}</div>
          <a href="/request/${r.id}" style="display: block; font-size: 11px; font-weight: 700; color: #2563eb; text-decoration: none; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">View Details →</a>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(popupContent);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([r.lng, r.lat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current!);

      markersRef.current.push(marker);
    });
  }, [isLoaded, requests]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-muted overflow-hidden rounded-lg">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      
      <div className="absolute bottom-4 right-4 z-20">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full shadow-md border bg-background font-medium text-xs h-9 px-4"
          onClick={requestLocation}
          disabled={locating}
        >
          <Locate className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          {locating ? "Locating…" : "Recenter"}
        </Button>
      </div>
    </div>
  );
}

export default RequestsMap;