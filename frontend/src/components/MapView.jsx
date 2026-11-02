import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Builds popup/tooltip content with textContent so names can never inject HTML.
const textNode = (lines) => {
  const div = document.createElement("div");
  lines.forEach((line, i) => {
    const el = document.createElement(i === 0 ? "strong" : "div");
    el.textContent = line;
    div.appendChild(el);
  });
  return div;
};

// center:  { lat, lng }            search centre (optional)
// radiusKm: number                 draws a circle around the centre (optional)
// markers: [{ lat, lng, color, lines: [title, ...details] }]
// onPick:  (lat, lng) => void      makes the map clickable to choose a centre
export default function MapView({ center, radiusKm, markers = [], onPick, height = 380 }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  // create the map once
  useEffect(() => {
    const m = L.map(box.current).setView([20.59, 78.96], 5); // India
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => pickRef.current && pickRef.current(e.latlng.lat, e.latlng.lng));
    map.current = m;
    requestAnimationFrame(() => m.invalidateSize());
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // redraw whenever the data changes
  const key = JSON.stringify([center, radiusKm, markers]);
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    layer.current.clearLayers();
    const points = [];
    let circle = null;

    if (center) {
      L.circleMarker([center.lat, center.lng], {
        radius: 9,
        color: "#1c2330",
        weight: 3,
        fillColor: "#ffffff",
        fillOpacity: 1,
      })
        .bindTooltip("Search centre")
        .addTo(layer.current);
      points.push([center.lat, center.lng]);
      if (radiusKm) {
        circle = L.circle([center.lat, center.lng], {
          radius: radiusKm * 1000,
          color: "#b0102b",
          weight: 2,
          fillOpacity: 0.07,
        }).addTo(layer.current);
      }
    }

    markers.forEach((mk) => {
      L.circleMarker([mk.lat, mk.lng], {
        radius: 8,
        color: "#ffffff",
        weight: 2,
        fillColor: mk.color || "#1a4fa0",
        fillOpacity: 0.95,
      })
        .bindPopup(textNode(mk.lines || []))
        .addTo(layer.current);
      points.push([mk.lat, mk.lng]);
    });

    if (circle) m.fitBounds(circle.getBounds(), { padding: [20, 20] });
    else if (points.length > 1) m.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    else if (points.length === 1) m.setView(points[0], 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div
      ref={box}
      className={`map-box ${onPick ? "pickable" : ""}`}
      style={{ height }}
      role="application"
      aria-label="Map"
    />
  );
}
