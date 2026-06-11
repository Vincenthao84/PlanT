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
  const markersRef = useRef<maplibregl.Marker[]>([]);
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
      center: [114.1694, 22.3193], // HK Default
      zoom: 12,
    });

    mapRef.current = map;

    // Fix: Force resize whenever the container changes size (e.g., tab switching)
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !requests) return;

    // Clear existing
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let validPins = 0;

    requests.forEach((r) => {
      const lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      const lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);
      
      // Strict data validation
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      validPins++;
      bounds.extend([lng, lat]);

      // Wrapper (MapLibre position)
      const el = document.createElement("div");
      el.className = "marker-wrapper";

      // Inner (Visual styling + Hover effects)
      const pin = document.createElement("div");
      pin.className = "pin-inner";
      pin.style.backgroundColor = colorMap[r.type] || "#3b82f6";
      el.appendChild(pin);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      // Popup
      const popup = new maplibregl.Popup({ offset: 15, closeButton: false, closeOnClick: false })
        .setHTML(`
          <div style="font-family: system-ui; padding: 4px;">
            <div style="font-weight:bold; font-size:13px;">${r.title}</div>
            <div style="color:#10b981; font-weight:bold; font-size:12px;">Price: ${r.reward || r.price || "N/A"}</div>
          </div>
        `);

      el.addEventListener("mouseenter", () => marker.setPopup(popup).togglePopup());
      el.addEventListener("mouseleave", () => marker.togglePopup());
      el.addEventListener("click", () => navigate({ to: "/request/$id", params: { id: r.id } }));

      markersRef.current.push(marker);
    });

    // Zoom Logic
    if (validPins === 1) {
      map.flyTo({ center: bounds.getCenter(), zoom: 15 });
    } else if (validPins > 1) {
      map.fitBounds(bounds, { padding: 50 });
    }

  }, [requests, navigate]);

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <style>{`
        .marker-wrapper { cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
        
        .pin-inner { 
          width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; 
          transition: transform 0.2s ease-in-out; 
        }
        
        .marker-wrapper:hover .pin-inner { transform: scale(1.3); }
        
        /* Ensure Popups look right */
        .maplibregl-popup-content { border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
