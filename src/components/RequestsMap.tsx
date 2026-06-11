import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StoredRequest } from "@/lib/request-types";
import { useNavigate } from "@tanstack/react-router";

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapRef.current = new maplibregl.Map({
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

    return () => mapRef.current?.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !requests) return;

    // Wait for the map to be fully loaded before adding markers
    if (!map.loaded()) {
      map.on("load", () => renderMarkers(map, requests));
    } else {
      renderMarkers(map, requests);
    }
  }, [requests, navigate]);

  const renderMarkers = (map: maplibregl.Map, requests: StoredRequest[]) => {
    const bounds = new maplibregl.LngLatBounds();
    let count = 0;

    requests.forEach((r) => {
      const lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      const lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);
      if (isNaN(lat) || isNaN(lng)) return;

      count++;
      bounds.extend([lng, lat]);

      const el = document.createElement("div");
      el.className = "map-marker-pin";
      el.style.backgroundColor = "#3b82f6";
      
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      // Simple Click handler
      el.addEventListener("click", () => navigate({ to: "/request/$id", params: { id: r.id } }));
    });

    if (count > 0) map.fitBounds(bounds, { padding: 50 });
  };

  return (
    <div className="relative w-full h-[400px]">
      <style>{`
        /* FORCED VISIBILITY: These styles make sure the pins are not hidden */
        .map-marker-pin {
          width: 20px !important;
          height: 20px !important;
          border-radius: 50% !important;
          border: 2px solid white !important;
          background-color: blue !important;
          cursor: pointer !important;
          display: block !important;
          position: absolute !important;
          z-index: 1000 !important;
        }
      `}</style>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
