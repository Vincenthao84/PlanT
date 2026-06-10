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

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Dynamically calculate center based on first request, fallback to Hong Kong
    const defaultCenter: [number, number] = requests && requests.length > 0 && !isNaN(requests[0].lng)
      ? [Number(requests[0].lng), Number(requests[0].lat)]
      : [114.1694, 22.3193];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap"
          }
        },
        layers: [
          {
            id: "osm-tiles-layer",
            type: "raster",
            source: "osm-tiles",
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
      setTimeout(() => map.resize(), 150);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Render Custom Markers safely
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !requests) return;

    // Clear old markers completely
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    console.log("Current requests data loading onto map:", requests);

    requests.forEach((r) => {
      // Safety check: ensure coordinates exist and are valid numbers
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const t = getRequestType(r.type);
      const hexColor = colorMap[r.type] || "#6b7280";
      const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

      // Programmatic absolute DOM generation wrapper to isolate marker rendering bugs
      const el = document.createElement("div");
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.display = "block";
      el.style.cursor = "pointer";
      
      // Explicit SVG structure injection with built-in layout parameters
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" style="display: block; filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.4));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${hexColor}" stroke="#ffffff" stroke-width="1.5"/>
          <text x="12" y="11" fill="#ffffff" font-size="8px" font-weight="800" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${shortLabel}</text>
        </svg>
      `;

      const popupContent = `
        <div style="padding: 4px; font-family: system-ui, sans-serif; width: 170px; color: #1e293b;">
          <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">${t?.label ?? "Request"}</div>
          <div style="font-size: 13px; font-weight: 700; margin: 2px 0; line-height: 1.2;">${r.title}</div>
          <div style="font-size: 11px; color: #475569;">📍 ${r.locationLabel || "Unknown Location"}</div>
          <div style="font-size: 11px; font-weight: 600; color: #10b981; margin-top: 2px;">💰 Suggested: ${r.reward || "None"}</div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -15], closeButton: false })
        .setHTML(popupContent);

      // CRITICAL MAPLIBRE STANDARD: LngLat parameter matches array structure exactly [lng, lat]
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current!);

      markersRef.current.push(marker);
    });
  }, [isLoaded, requests]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-muted overflow-hidden rounded-lg border">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}

export default RequestsMap;