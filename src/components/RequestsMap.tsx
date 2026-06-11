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
/
const iconMap: Record<string, string> = {
  snap: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`,
  knowledge: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke-dasharray="2 2" stroke-opacity="0.3"></path><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path><path d="M12 5v13"></path></svg>`,
  action: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8.5"></path><path d="M18 8a2 2 0 0 1 2 2v3a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7v-3a2 2 0 0 1 4 0v1.5"></path></svg>`,
  object: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  rental: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 3-9.5 9.5"></path><path d="m19 5 1.5 1.5"></path><path d="m16 8 1.5 1.5"></path></svg>`,
  anything: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>`
};

export function RequestsMap({ requests }: { requests: StoredRequest[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const isSingleRequest = requests && requests.length === 1 && requests[0];
    
    let initialCenter: [number, number] = [114.1694, 22.3193];
    let initialZoom = 12;

    if (isSingleRequest) {
      const r = requests[0];
      const lat = Number(r.lat ?? r.latitude ?? r?.location?.lat);
      const lng = Number(r.lng ?? r.longitude ?? r?.location?.lng ?? r.lon);
      if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
        initialCenter = [lng, lat];
        initialZoom = 15;
      }
    }

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
      center: initialCenter, 
      zoom: initialZoom,        
    });

    mapRef.current = map;

    if (!isSingleRequest && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mapRef.current) {
            map.setCenter([pos.coords.longitude, pos.coords.latitude]);
            map.setZoom(13);
          }
        },
        (err) => console.log("Geolocation fallback used:", err)
      );
    }

    return () => {
      map.remove();
    };
  }, [requests]);

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

      const el = document.createElement("div");
      el.className = "custom-permanent-marker";

      el.innerHTML = `
        <div class="marker-pin-bubble" style="background-color: ${hexColor};">
          ${svgIcon}
        </div>
        <div class="marker-info-label">
          <span class="label-title">${r.title || "Request"}</span>
          <span class="label-price">${r.reward || r.price || "N/A"}</span>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate({ to: "/request/$id", params: { id: r.id } });
      });

      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: "top-left"
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
        .custom-permanent-marker {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          pointer-events: auto !important;
          transform: translate(-16px, -16px); 
        }

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

        .marker-info-label {
          background: #ffffff;
          padding: 6px 10px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
          border: 1px solid #cbd5e1;
          display: flex;
          flex-direction: column;
          max-width: 160px;
          font-family: system-ui, -apple-system, sans-serif;
          pointer-events: none;
          z-index: 1;
        }

        .label-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .label-price {
          font-size: 11px;
          font-weight: 700;
          color: #10b981;
          margin-top: 2px;
        }

        .custom-permanent-marker:hover {
          z-index: 99999 !important;
        }
        
        .custom-permanent-marker:hover .marker-pin-bubble {
          transform: scale(1.1);
        }

        /* FIX: Forces the OpenStreetMap attribution block completely 
           away from the bottom-left corner to stop overlapping the address.
        */
        .maplibregl-ctrl-bottom-left {
          display: none !important; /* Removes default positioning container */
        }

        .maplibregl-ctrl-attrib {
          position: absolute !important;
          bottom: 12px !important;
          right: 110px !important; /* Pushes it leftward next to the "Open in maps" button */
          background-color: rgba(255, 255, 255, 0.85) !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          border: 1px solid #e2e8f0 !important;
          font-size: 11px !important;
          color: #64748b !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
        }

        .maplibregl-ctrl-attrib a {
          color: #3b82f6 !important;
          text-decoration: none !important;
        }
        
        .maplibregl-ctrl-attrib a:hover {
          text-decoration: underline !important;
        }

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
