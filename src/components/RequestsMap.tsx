import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StoredRequest } from "@/lib/request-types";
import { useNavigate } from "@tanstack/react-router";

// ... (Keep colorMap and iconMap exactly as before)

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null); // Manual Popup DOM
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: { version: 8, sources: { "osm": { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OSM" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] },
      center: [114.1694, 22.3193], // Default Hong Kong
      zoom: 12,
    });

    mapRef.current = map;

    // Create the persistent popup DOM element
    const p = document.createElement("div");
    p.className = "custom-hover-popup";
    document.body.appendChild(p);
    popupRef.current = p;

    return () => {
      p.remove();
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !requests) return;

    const bounds = new maplibregl.LngLatBounds();
    let validPins = 0;

    requests.forEach((r) => {
      const lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      const lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);
      if (isNaN(lat) || isNaN(lng)) return;

      validPins++;
      const coords: [number, number] = [lng, lat];
      bounds.extend(coords);

      const el = document.createElement("div");
      el.className = "marker-container";
      el.innerHTML = `<div class="pin" style="background-color: ${colorMap[r.type] || '#3b82f6'}"></div>`;

      el.addEventListener("mouseenter", (e) => {
        if (!popupRef.current) return;
        popupRef.current.style.display = "block";
        popupRef.current.style.left = `${e.clientX + 15}px`;
        popupRef.current.style.top = `${e.clientY + 15}px`;
        popupRef.current.innerHTML = `
            <div style="font-weight:bold">${r.title}</div>
            <div style="color:#10b981; font-weight:600;">Price: ${r.reward || r.price || 'N/A'}</div>
        `;
      });

      el.addEventListener("mousemove", (e) => {
        if (!popupRef.current) return;
        popupRef.current.style.left = `${e.clientX + 15}px`;
        popupRef.current.style.top = `${e.clientY + 15}px`;
      });

      el.addEventListener("mouseleave", () => {
        if (popupRef.current) popupRef.current.style.display = "none";
      });

      el.addEventListener("click", () => navigate({ to: "/request/$id", params: { id: r.id } }));

      new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(mapRef.current!);
    });

    if (validPins > 0) {
      // Force resize then fit
      setTimeout(() => {
        mapRef.current?.resize();
        if (validPins === 1) mapRef.current?.flyTo({ center: bounds.getCenter(), zoom: 15 });
        else mapRef.current?.fitBounds(bounds, { padding: 50 });
      }, 100);
    }
  }, [requests, navigate]);

  return (
    <div className="w-full h-full relative">
      <style>{`
        .marker-container { cursor: pointer; }
        .pin { width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .custom-hover-popup { 
            position: fixed; z-index: 9999; background: white; padding: 8px; border-radius: 6px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.2); display: none; pointer-events: none;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
