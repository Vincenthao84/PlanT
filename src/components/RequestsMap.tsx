import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";

// Category colors for the pins
const colorMap: Record<string, string> = {
  snap: "#ef4444", knowledge: "#3b82f6", action: "#10b981",
  object: "#f59e0b", rental: "#8b5cf6", anything: "#6b7280",
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 1. Initialize the map
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
      center: [114.1694, 22.3193], // Default to HK
      zoom: 12,
    });

    // 2. Add interaction controls
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    // 3. Handle Markers once map is ready
    map.on("load", () => {
      mapInstanceRef.current = map;

      requests.forEach((r) => {
        const el = document.createElement("div");
        el.className = "marker";
        el.style.width = "24px";
        el.style.height = "24px";
        el.style.backgroundColor = colorMap[r.type] || "#6b7280";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
        el.style.cursor = "pointer";

        new maplibregl.Marker({ element: el })
          .setLngLat([Number(r.lng), Number(r.lat)])
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [requests]);

  return (
    <div className="w-full h-[450px] relative overflow-hidden rounded-lg border shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}

export default RequestsMap;