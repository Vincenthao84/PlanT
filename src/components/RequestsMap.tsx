import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StoredRequest } from "@/lib/request-types";

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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "osm": { 
            type: "raster", 
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], 
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          } 
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [0, 0], // Global default starting point
      zoom: 2,        
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !requests) return;

    // Clear old markers cleanly to prevent duplicates
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let validPinsCount = 0;

    requests.forEach((r: any) => {
      if (!r) return;

      // Extract coordinates cleanly
      let lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      let lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);

      // Skip invalid or empty database entries
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      validPinsCount++;
      
      // MapLibre strictly reads [Longitude, Latitude]
      const coordinates: [number, number] = [lng, lat];
      bounds.extend(coordinates);

      const hexColor = colorMap[r.type] || "#3b82f6";

      const popupContent = `
        <div style="padding: 4px; font-family: system-ui, -apple-system, sans-serif; min-width: 120px;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${r.title || "Request"}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">📍 ${r.locationLabel || "Location"}</div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: [0, -15], closeButton: false }).setHTML(popupContent);

      // USE NATIVE MARKER: This prevents CSS dropping issues completely.
      const marker = new maplibregl.Marker({ color: hexColor })
        .setLngLat(coordinates) 
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Frame the camera dynamically based on the valid data
    if (validPinsCount > 0) {
        if (validPinsCount === 1) {
            // For Single Detail Page: Center directly on the lone pin
            mapRef.current.setCenter(bounds.getCenter());
