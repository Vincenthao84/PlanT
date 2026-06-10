import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. Initialize Core Map Instance Engine
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Determine initial fallback center point safely
    const hasData = requests && requests.length > 0 && requests[0];
    const initialCenter: [number, number] = hasData && !isNaN(Number(requests[0].lng))
      ? [Number(requests[0].lng), Number(requests[0].lat)]
      : [114.1694, 22.3193];

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "osm": { 
            type: "raster", 
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], 
            tileSize: 256,
            attribution: "© OpenStreetMap"
          } 
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: initialCenter,
      zoom: hasData ? 14 : 12, // Zoom closer if focusing on a single specific request detail page
    });

    mapRef.current = map;

    // Keep layout calculations perfect if container sizes change or load asynchronously
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    map.on("load", () => {
      setIsMapReady(true);
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, []); // Only runs once on mount to establish canvas viewport

  // 2. Separate Dynamic Marker Layer (Watches data updates independently!)
  useEffect(() => {
    // We need BOTH the engine ready AND actual loaded request data
    if (!isMapReady || !mapRef.current || !requests || requests.length === 0) return;

    // Clear any leftover previous markers to prevent duplicates on state updates
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    requests.forEach((r) => {
      // Safety filter out uninitialized or broken objects
      if (!r || isNaN(Number(r.lng)) || isNaN(Number(r.lat))) return;

      const lng = Number(r.lng);
      const lat = Number(r.lat);

      const t = getRequestType(r.type);
      const hexColor = colorMap[r.type] || "#6b7280";
      const shortLabel = r.type ? r.type.substring(0, 2).toUpperCase() : "RQ";

      // Programmatic DOM construction for layout stability
      const el = document.createElement("div");
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.display = "block";
      el.style.cursor = "pointer";
      el.style.zIndex = "9999";

      // Inject clean SVG pin architecture with custom category coloring hooks
      el.innerHTML = `
        <svg viewBox="0 0 24 24" width="32" height="32" style="display: block; filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.35)); pointer-events: none;">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${hexColor}" stroke="#ffffff" stroke-width="1.5"/>
          <text x="12" y="11" fill="#ffffff" font-size="8px" font-weight="800" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${shortLabel}</text>
        </svg>
      `;

      // Description popup layout string setup configuration
      const popupContent = `
        <div style="padding: 4px; font-family: system-ui, -apple-system, sans-serif; width: 160px; color: #1e293b; line-height: 1.4;">
          <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">${t?.label ?? "Request"}</div>
          <div style="font-size: 13px; font-weight: 700; margin: 1px 0; color: #0f172a; line-height: 1.2;">${r.title}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">📍 ${r.locationLabel || "Location"}</div>
          ${r.reward ? `<div style="font-size: 11px; font-weight: 600; color: #10b981;">💰 ${r.reward}</div>` : ""}
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -10], closeButton: false })
        .setHTML(popupContent);

      // Create new Maplibre marker element
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapRef.current);

      // Save marker reference so it can be managed cleanly
      markersRef.current.push(marker);
    });

    // Automatically pan map camera view right directly over the loaded single request coordinates
    if (requests.length === 1 && requests[0]) {
      const targetLng = Number(requests[0].lng);
      const targetLat = Number(requests[0].lat);
      if (!isNaN(targetLng) && !isNaN(targetLat)) {
        mapRef.current.flyTo({
          center: [targetLng, targetLat],
          zoom: 14,
          essential: true
        });
      }
    }
  }, [isMapReady, requests]); // 🚀 CRITICAL: Runs instantly the moment 'requests' array finishes fetching data!

  return (
    <div className="w-full h-full min-h-[400px] relative bg-muted/30">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}

export default RequestsMap;
