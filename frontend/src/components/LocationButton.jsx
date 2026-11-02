import { useState } from "react";

// Asks the browser for the device location and returns it as numbers.
// onLocate(lat, lng) is called on success.
export default function LocationButton({ onLocate, label = "Use my location", saved = false }) {
  const [state, setState] = useState("");

  const locate = () => {
    if (!navigator.geolocation) {
      setState("Your browser does not support location.");
      return;
    }
    setState("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocate(pos.coords.latitude, pos.coords.longitude);
        setState("Location added.");
      },
      () => setState("Could not get your location. Allow location access and try again."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <span className="location-btn">
      <button type="button" className="ghost" onClick={locate}>
        {saved ? "Update my location" : label}
      </button>
      {state && (
        <small role="status" className="location-state">
          {state}
        </small>
      )}
    </span>
  );
}
