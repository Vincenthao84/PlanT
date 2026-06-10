import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoredRequest } from "@/lib/request-types";
import { getRequestType } from "@/lib/request-types";

const colorMap: Record<string, string> = {
  snap: "#ef4444", knowledge: "#3b82f6", action: "#10b981",
  object: "#f59e0b", rental: "#8b5cf6", anything: "#6b7280",
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: { "osm": { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256 } },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [114.1694, 22.3193],
      zoom: 12,
    });

    map.on("load", () => {
      mapInstanceRef.current = map;
      setIsLoaded(true);
    });

    // Forced init fallback
    const timer = setTimeout(() => {
      if (!isLoaded) {
        mapInstanceRef.current = map;
        setIsLoaded(true);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;
    
    requests.forEach((r) => {
      const el = document.createElement("div");
      el.style.width = "24px"; 
      el.style.height = "24px";
      el.style.backgroundColor = colorMap[r.type] || "#6b7280";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      
      new maplibregl.Marker({ element: el })
        .setLngLat([r.lng, r.lat])
        .addTo(mapInstanceRef.current!);
    });
  }, [isLoaded, requests]);

  return (
    <div className="relative w-full h-[450px] rounded-lg overflow-hidden border">
      <div ref={mapContainerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          Loading Map...
        </div>
      )}
    </div>
  );
}

export default RequestsMap;