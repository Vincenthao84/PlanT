import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";

// Category Color Scheme (Matches your active UI design tokens)
const colorMap: Record<string, string> = {
  snap: "#ef4444",      // Red
  knowledge: "#3b82f6", // Blue
  action: "#10b981",    // Emerald
  object: "#f59e0b",    // Amber
  rental: "#8b5cf6",    // Purple
  anything: "#6b7280",  // Gray
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [locating, setLocating] = useState(false);

  // 1. Initialize Base Map Engine Canvas
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Center map on the first request if available, otherwise default to Hong Kong core coordinates
    const defaultCenter: [number, number] = requests && requests.length > 0 && !isNaN(requests[0].lng)
      ? [Number(requests[0].lng), Number(requests[0].lat)]
      : [114.1694, 22.3193];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      // Production HTTPS Secure OpenStreetMap Standard Tile Layer Structure
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

    // Add UI Zoom buttons in top corner
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      mapInstanceRef.current = map;
      setIsLoaded(true);
      // Recalculate container bounds immediately upon mount to prevent layout clipping
      setTimeout(() => map.resize(), 150);
    });

    return () => {
      map.remove();
    };
  }, []);

  // 2. Locate User Viewport Functionality
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

  // 3. Render Custom Pins & Popup Description Cards Dynamically
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !requests) return;

    // Clear previous markers to prevent interface duplicates during array changes
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    console.log("Current requests data loading onto map:", requests);

    requests.forEach((r) => {
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      
      // Filter out any entries with broken coordinates
      if (isNaN(lat) || isNaN(lng)) return;

      const t = getRequestType(r.type);
      const hexColor = colorMap[r.type] || "#6b7280";
      const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

      // Build out an isolated DOM container wrapper for the marker
      const el = document.createElement("div");
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.display = "block";
      el.style.cursor = "pointer";
      
      // Force marker container to sit entirely on top of the layout render canvas
      el.style.zIndex = "9999";
      el.style.position = "absolute";
      
      // Native SVG composition containing category dynamic colors and labels
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" style="display: block; filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.4)); pointer-events: none;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${hexColor}" stroke="#ffffff" stroke-width="1.5"/>
          <text x="12" y="11" fill="#ffffff" font-size="8px" font-weight="800" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${shortLabel}</text>
        </svg>
      `;

      // Description popup layout string configuration
      const popupContent = `
        <div style="padding: 4px; font-family: system-ui, -apple-system, sans-serif; width: 170px; color: #1e293b; line-height: 1.4;">
          <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">${t?.label ?? "Request"}</div>
          <div style="font-size: 13px; font-weight: 700; margin: 2px 0; color: #0f172a; line-height: 1.2;">${r.title}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">📍 ${r.locationLabel || "Unknown Location"}</div>
          <div style="font-size: 11px; font-weight: 600; color: #10b981;">💰 Suggested: ${r.reward || "None"}</div>
          <a href="/request/${r.id}" style="display: block; font-size: 11px; font-weight: 700; color: #2563eb; text-decoration: none; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 4px;">View Details →</a>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -10], closeButton: false })
        .setHTML(popupContent);

      // Mount marker to canvas matching Maplibre's [lng, lat] alignment format
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'bottom' // Locks the precise bottom coordinate point of your SVG pin
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current!);

      markersRef.current.push(marker);
    });
  }, [isLoaded, requests]);

  // Initial loading pulse interface configuration
  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[420px] bg-muted animate-pulse flex items-center justify-center text-muted-foreground text-sm font-medium">
        Assembling viewport canvas…
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[420px] bg-muted overflow-hidden rounded-lg border shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      
      {/* Floating Recenter Navigation Widget Button */}
      <div className="absolute bottom-4 right-4 z-20">
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full shadow-md border bg-background font-semibold text-xs h-9 px-4 active:scale-95 transition-transform"
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