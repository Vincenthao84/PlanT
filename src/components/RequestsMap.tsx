import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css"; // Ensure this is imported here or in globals.css
import type { StoredRequest } from "@/lib/request-types";

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use a simpler style to ensure we aren't fighting with complex tile loading
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

    mapInstanceRef.current = map;

    map.on("load", () => {
      // Add markers once the map is truly ready
      requests.forEach((r) => {
        const el = document.createElement("div");
        el.className = "marker";
        el.style.width = "20px";
        el.style.height = "20px";
        el.style.backgroundColor = "red"; // Bright red to test visibility
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.cursor = "pointer";
        el.style.zIndex = "1000"; // Force pin to the front

        new maplibregl.Marker({ element: el })
          .setLngLat([r.lng, r.lat])
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [requests]);

  return (
    <div className="relative w-full h-[450px] border border-gray-300">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full" 
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      />
    </div>
  );
}

export default RequestsMap;