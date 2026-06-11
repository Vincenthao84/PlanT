import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StoredRequest } from "@/lib/request-types";
import { useNavigate } from "@tanstack/react-router";

// Keep these strictly as they were in your working version
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
  const navigate = useNavigate();

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OSM" }
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [114.1694, 22.3193], // Default Hong Kong
      zoom: 12,
    });

    mapRef.current = map;

    // Fix for Tab Switching: If the container resizes, tell the map
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, []);

  // 2. Render Markers with the EXACT working coordinate extraction
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !requests) return;

    // Clear previous
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let validPins = 0;

    requests.forEach((r) => {
      // THIS IS THE WORKING LOGIC:
      const lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      const lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      validPins++;
      const coords: [number, number] = [lng, lat];
      bounds.extend(coords);

      // Create Custom Pin
      const el = document.createElement("div");
      el.className = "custom-pin";
      el.style.backgroundColor = colorMap[r.type] || "#3b82f6";
      
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);

      // Hover and Click
      el.addEventListener("mouseenter", () => {
         // Title + Price display
         el.setAttribute("title", `${r.title}\nSuggested Price: ${r.reward || r.price || "N/A"}`);
      });
      el.addEventListener("click", () => navigate({ to: "/request/$id", params: { id: r.id } }));

      markersRef.current.push(marker);
    });

    // 3. Zoom Logic
    if (validPins > 0) {
      setTimeout(() => {
        if (validPins === 1) {
          map.flyTo({ center: bounds.getCenter(), zoom: 15 });
        } else {
          map.fitBounds(bounds, { padding: 50 });
        }
      }, 100); // Small delay to ensure container is measured
    }
  }, [requests, navigate]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <style>{`
        .custom-pin {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid white;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .custom-pin:hover {
          transform: scale(1.2);
          z-index: 999;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
