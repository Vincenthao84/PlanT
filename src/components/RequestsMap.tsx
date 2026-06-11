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

const iconMap: Record<string, string> = {
  snap: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
  knowledge: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  action: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  object: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  rental: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  anything: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`
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
          "osm": { 
            type: "raster", 
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], 
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          } 
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      },
      center: [114.1694, 22.3193], 
      zoom: 12,        
    });

    mapRef.current = map;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setCenter([pos.coords.longitude, pos.coords.latitude]);
          map.setZoom(13);
        },
        (err) => console.log("Geolocation fallback used:", err)
      );
    }

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !requests) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    requests.forEach((r: any) => {
      if (!r) return;

      let lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      let lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);

      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

      const coordinates: [number, number] = [lng, lat];
      const hexColor = colorMap[r.type] || "#3b82f6";
      const svgIcon = iconMap[r.type] || iconMap.anything;

      // 1. Root container for the custom element
      const el = document.createElement("div");
      el.className = "custom-permanent-marker";

      // 2. Build layout content directly inside the marker container layout tree
      el.innerHTML = `
        <div class="marker-pin-bubble" style="background-color: ${hexColor};">
          ${svgIcon}
        </div>
        <div class="marker-info-label">
          <span class="label-title">${r.title || "Request"}</span>
          <span class="label-price">${r.reward || r.price || "N/A"}</span>
        </div>
      `;

      // 3. Clean routing link click context
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate({ to: "/request/$id", params: { id: r.id } });
      });

      // 4. Anchor the entire structure directly into MapLibre
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: "top-left" // Pins the absolute top left of our block to the geographical coordinate
      })
        .setLngLat(coordinates)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    mapRef.current.resize();
    
  }, [requests, navigate]);

  return (
    <div className="w-full h-full min-h-[400px] relative z-0">
      <style>{`
        /* Core wrapper layout combining icon and descriptive label */
        .custom-permanent-marker {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          pointer-events: auto !important;
          /* Offsets layout translation so the pin graphic aligns perfectly with the coordinates */
          transform: translate(-16px, -16px); 
        }

        /* The Round Icon Badge styling */
        .marker-pin-bubble {
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.1s ease-in-out;
          z-index: 2;
        }

        /* The Permanent Label Card box right next to the pin */
        .marker-info-label {
          background: #ffffff;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          max-width: 130px;
          font-family: system-ui, -apple-system, sans-serif;
          pointer-events: none;
          z-index: 1;
        }

        .label-title {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .label-price {
          font-size: 10px;
          font-weight: 600;
          color: #10b981;
          margin-top: 1px;
        }

        /* Brings element forward on hover profile */
        .custom-permanent-marker:hover {
          z-index: 99999 !important;
        }
        
        .custom-permanent-marker:hover .marker-pin-bubble {
          transform: scale(1.1);
        }

        /* Standard native map system overrides */
        .maplibregl-marker {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          transition: none !important;
          transform-style: flat !important;
        }
        
        .maplibregl-canvas {
          transition: none !important;
        }
      `}</style>
      
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}

export default RequestsMap;
