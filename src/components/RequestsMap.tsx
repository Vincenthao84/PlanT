import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StoredRequest } from "@/lib/request-types";
import { useNavigate } from "@tanstack/react-router";

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
  const navigate = useNavigate();

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
      center: [114.1694, 22.3193],
      zoom: 12,
    });

    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !requests || !map.loaded()) return;

    const bounds = new maplibregl.LngLatBounds();
    let count = 0;

    requests.forEach((r) => {
      const lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      const lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);
      if (isNaN(lat) || isNaN(lng)) return;

      count++;
      bounds.extend([lng, lat]);

      // Create Popup
      const popup = new maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: false })
        .setHTML(`
          <div style="font-family: sans-serif;">
            <div style="font-weight:bold; font-size:14px;">${r.title}</div>
            <div style="color:#10b981; font-weight:bold; font-size:12px;">Price: ${r.reward || r.price || "N/A"}</div>
          </div>
        `);

      // Create Marker Element
      const el = document.createElement("div");
      el.className = "marker";
      el.style.backgroundColor = colorMap[r.type] || "#3b82f6";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      // Mouse events for Hover
      el.addEventListener("mouseenter", () => marker.togglePopup());
      el.addEventListener("mouseleave", () => marker.togglePopup());
      el.addEventListener("click", () => navigate({ to: "/request/$id", params: { id: r.id } }));
    });

    if (count > 0) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [requests, navigate]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <style>{`
        .marker { width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; cursor: pointer; }
        .marker:hover { transform: scale(1.2); }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
