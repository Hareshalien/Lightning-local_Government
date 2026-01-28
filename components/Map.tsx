
import React, { useEffect, useRef } from 'react';
import { Report } from '../types';

// Declare google global to avoid TypeScript errors
declare const google: any;

interface MapProps {
  reports: Report[];
  isActive: boolean;
}

const Map: React.FC<MapProps> = ({ reports, isActive }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Initialize Map and Manage Markers
  useEffect(() => {
    if (!mapRef.current) return;
    if (typeof google === 'undefined') {
      console.error("Google Maps API not loaded");
      return;
    }

    // Initialize Map
    if (!mapInstanceRef.current) {
      const defaultCenter = { lat: 3.007, lng: 101.797 }; // Centered near Kajang
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: reports.length > 0 && reports[0].latitude !== 0 
          ? { lat: reports[0].latitude, lng: reports[0].longitude } 
          : defaultCenter,
        zoom: 13,
        mapId: 'DEMO_MAP_ID', // Required for AdvancedMarkerElement
        disableDefaultUI: false,
        streetViewControl: false,
      });
    }

    // Clear existing markers
    markersRef.current.forEach((marker: any) => {
      marker.map = null;
    });
    markersRef.current = [];

    // Add new markers using AdvancedMarkerElement
    reports.forEach((report) => {
      // Skip if coordinates are 0,0
      if (report.latitude === 0 && report.longitude === 0) return;

      const position = { lat: report.latitude, lng: report.longitude };
      
      // Create DOM element for the custom marker
      const markerContainer = document.createElement("div");
      markerContainer.className = "custom-marker group cursor-pointer transition-transform transform hover:scale-110 hover:z-50";
      
      // Explicit styles for blue round-edged borders
      markerContainer.style.width = "50px";
      markerContainer.style.height = "50px";
      markerContainer.style.borderRadius = "50%"; // Round
      markerContainer.style.border = "4px solid #3b82f6"; // Blue-500 border
      markerContainer.style.backgroundColor = "white";
      markerContainer.style.overflow = "hidden";
      markerContainer.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
      markerContainer.style.position = "relative";

      if (report.imageBase64 && report.imageBase64.length > 50) {
        const imageSrc = report.imageBase64.startsWith('data:image') 
          ? report.imageBase64 
          : `data:image/jpeg;base64,${report.imageBase64}`;
        
        const img = document.createElement("img");
        img.src = imageSrc;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        markerContainer.appendChild(img);
      } else {
        // Fallback icon if no image
        const fallback = document.createElement("div");
        fallback.style.width = "100%";
        fallback.style.height = "100%";
        fallback.style.display = "flex";
        fallback.style.alignItems = "center";
        fallback.style.justifyContent = "center";
        fallback.style.backgroundColor = "#eff6ff"; // blue-50
        fallback.innerHTML = `<svg style="width: 20px; height: 20px; color: #3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`;
        markerContainer.appendChild(fallback);
      }

      // --- Custom InfoWindow Content ---
      const infoDiv = document.createElement("div");
      infoDiv.style.width = "260px";
      infoDiv.style.fontFamily = "ui-sans-serif, system-ui, sans-serif";
      infoDiv.style.backgroundColor = "white";
      infoDiv.style.position = "relative";

      // 1. Close Button
      const closeBtn = document.createElement("button");
      closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      closeBtn.style.position = "absolute";
      closeBtn.style.top = "8px";
      closeBtn.style.right = "8px";
      closeBtn.style.width = "28px";
      closeBtn.style.height = "28px";
      closeBtn.style.borderRadius = "50%";
      closeBtn.style.backgroundColor = "rgba(0,0,0,0.6)";
      closeBtn.style.color = "white";
      closeBtn.style.border = "none";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.zIndex = "50";
      closeBtn.style.display = "flex";
      closeBtn.style.alignItems = "center";
      closeBtn.style.justifyContent = "center";
      closeBtn.style.transition = "background-color 0.2s";
      
      closeBtn.onmouseenter = () => { closeBtn.style.backgroundColor = "#ef4444"; };
      closeBtn.onmouseleave = () => { closeBtn.style.backgroundColor = "rgba(0,0,0,0.6)"; };

      // 2. Image in InfoWindow
      if (report.imageBase64 && report.imageBase64.length > 50) {
        const imageSrc = report.imageBase64.startsWith('data:image') 
          ? report.imageBase64 
          : `data:image/jpeg;base64,${report.imageBase64}`;
        
        const infoImg = document.createElement("img");
        infoImg.src = imageSrc;
        infoImg.style.width = "100%";
        infoImg.style.height = "150px";
        infoImg.style.objectFit = "cover";
        infoImg.style.display = "block";
        infoDiv.appendChild(infoImg);
      }

      // 3. Text Content
      const textContainer = document.createElement("div");
      textContainer.style.padding = "16px";

      // Description as main title (Bold Blue)
      const title = document.createElement("h3");
      title.textContent = report.description;
      title.style.margin = "0 0 6px 0";
      title.style.fontSize = "14px";
      title.style.fontWeight = "700";
      title.style.color = "#1e3a8a"; // blue-900
      title.style.lineHeight = "1.3";

      // Address as secondary text
      const desc = document.createElement("p");
      desc.textContent = report.address;
      desc.style.margin = "0 0 10px 0";
      desc.style.fontSize = "12px";
      desc.style.color = "#475569"; // slate-600
      desc.style.lineHeight = "1.5";

      const meta = document.createElement("div");
      meta.style.fontSize = "11px";
      meta.style.color = "#94a3b8"; // slate-400
      meta.style.fontWeight = "600";

      let displayDate = report.timestampString || 'Reported recently';
      try {
        if (report.dateTime) {
          const date = new Date(report.dateTime);
          if (!isNaN(date.getTime())) {
             displayDate = date.toLocaleString(undefined, {
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
          }
        }
      } catch (e) {
        console.error("Date parsing error in map", e);
      }

      meta.innerHTML = `<span style="color:#3b82f6">●</span> ${displayDate}`;

      textContainer.appendChild(title);
      textContainer.appendChild(desc);
      textContainer.appendChild(meta);

      infoDiv.appendChild(closeBtn);
      infoDiv.appendChild(textContainer);

      const infoWindow = new google.maps.InfoWindow({
        content: infoDiv,
        headerDisabled: true,
        minWidth: 260
      });

      // Handle Close
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        infoWindow.close();
      });

      // Check if AdvancedMarkerElement is available
      let marker;
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position: position,
          content: markerContainer,
          title: report.description,
        });
      } else {
        marker = new google.maps.Marker({
          position: position,
          map: mapInstanceRef.current,
          title: report.description,
        });
      }

      // Add click listener
      markerContainer.addEventListener('click', () => {
         infoWindow.open({
          anchor: marker,
          map: mapInstanceRef.current,
        });
      });
      
      marker.addListener("click", () => {
        infoWindow.open({
          anchor: marker,
          map: mapInstanceRef.current,
        });
      });

      markersRef.current.push(marker);
    });

  }, [reports]);

  // 2. Focus on reports when Active or Reports Change
  useEffect(() => {
    if (isActive && mapInstanceRef.current && reports.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      let hasValidBounds = false;

      reports.forEach((report) => {
        if (report.latitude !== 0 || report.longitude !== 0) {
          bounds.extend({ lat: report.latitude, lng: report.longitude });
          hasValidBounds = true;
        }
      });

      if (hasValidBounds) {
        // Trigger resize to fix any display:none render issues
        google.maps.event.trigger(mapInstanceRef.current, 'resize');
        
        // Fit bounds
        mapInstanceRef.current.fitBounds(bounds);

        // Optional: limit zoom level if there's only one point
        const listener = google.maps.event.addListener(mapInstanceRef.current, "idle", () => { 
          if (mapInstanceRef.current.getZoom() > 17) {
            mapInstanceRef.current.setZoom(17);
          }
          google.maps.event.removeListener(listener); 
        });
      }
    }
  }, [isActive, reports]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-xl shadow-blue-900/10 border border-blue-200 relative">
      <div ref={mapRef} className="w-full h-full" />
      {/* Legend overlay */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-4 py-3 rounded-lg shadow-lg z-10 pointer-events-none border-l-4 border-cyan-500">
        <span className="text-sm font-bold text-blue-900 block">Live Incident Map</span>
        <span className="text-xs text-blue-500">{reports.length} Active Reports</span>
      </div>
    </div>
  );
};

export default Map;
