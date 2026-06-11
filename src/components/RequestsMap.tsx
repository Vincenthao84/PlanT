import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StoredRequest } from "@/lib/request-types";
import { useNavigate } from "@tanstack/react-router";

// Using your stable icon and color maps
const colorMap: Record<string, string> = {
  snap: "#ef4444", knowledge: "#3b82f6", action: "#10b981",
  object: "#f59e0b", rental: "#8b5cf6", anything: "#6b7280",
};

const iconMap: Record<string, string> = {
  snap: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
  knowledge: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  action: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  object: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  rental: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  anything: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const navigate = useNavigate();

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OSM" } },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [114.1694, 22.3193], // Start HK, then fly to user
      zoom: 12,
    });

    // 2. Fly to User Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapRef.current?.flyTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: 13
          });
        },
        () => console.log("User denied location access")
      );
    }

    return () => mapRef.current?.remove();
  }, []);

  // 3. Render Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !requests) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    requests.forEach(r => {
      const lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      const lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      const el = document.createElement("div");
      el.className = "custom-map-pin";
      el.style.backgroundColor = colorMap[r.type] || "#3b82f6";
      el.innerHTML = iconMap[r.type] || iconMap.anything;

      const popup = new maplibregl.Popup({ offset: [0, -20], closeButton: false, closeOnClick: false })
        .setHTML(`
          <div style="padding: 6px; font-family: sans-serif; font-size: 13px;">
            <div style="font-weight:700; color:#1e293b;">${r.title}</div>
            <div style="font-weight:600; color:#10b981;">Price: ${r.reward || r.price || "N/A"}</div>
          </div>
        `);

      el.addEventListener('mouseenter', () => popup.setLngLat([lng, lat]).addTo(map));
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', () => navigate({ to: "/request/$id", params: { id: r.id } }));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [requests, navigate]);

  return (
    <div className="relative w-full h-[400px]">
      <style>{`
        .custom-map-pin { width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; }
        .custom-map-pin:hover { transform: scale(1.2); }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
