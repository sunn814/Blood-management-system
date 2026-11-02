import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import MapView from "../components/MapView";
import LocationButton from "../components/LocationButton";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

// Blood Compatibility Matcher with radius search and map:
// patient's group -> compatible groups + stock + eligible donors near a chosen point
export default function Matcher() {
  const [params] = useSearchParams();
  const [group, setGroup] = useState(params.get("group") || "");
  const [center, setCenter] = useState(() => {
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    return params.get("lat") && params.get("lng") && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null;
  });
  const [radius, setRadius] = useState(center ? "25" : "any"); // "any" = no distance limit
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState({}); // donor id -> full phone number

  const search = async (bloodGroup, c = center, r = radius) => {
    setError("");
    if (r !== "any" && !c) {
      setError("Choose a search location first: use your location or click on the map.");
      return;
    }
    setLoading(true);
    try {
      const query = { bloodGroup };
      if (r !== "any" && c) Object.assign(query, { lat: c.lat, lng: c.lng, radiusKm: r });
      const { data } = await api.get("/donors/compatible", { params: query });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.response?.data?.message || "Could not find donors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const g = params.get("group");
    if (g && BLOOD_GROUPS.includes(g)) search(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revealPhone = async (id) => {
    setError("");
    try {
      const { data } = await api.post(`/donors/${id}/reveal`);
      setRevealed((r) => ({ ...r, [id]: data.phone }));
    } catch (err) {
      setError(err.response?.data?.message || "Could not show this number");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (group) search(group);
  };

  const pickCenter = (lat, lng) => {
    const c = { lat, lng };
    setCenter(c);
    if (group) search(group, c, radius === "any" ? "25" : radius);
    if (radius === "any") setRadius("25");
  };

  const donors = result?.donors || [];
  const pins = donors
    .filter((d) => d.lat !== null && d.lng !== null)
    .map((d) => ({
      lat: d.lat,
      lng: d.lng,
      color: d.match === "exact" ? "#1e7b4f" : "#1a4fa0",
      lines: [
        d.name,
        `${d.bloodGroup} (${d.match})`,
        d.distanceKm !== null ? `${d.distanceKm} km away` : "",
        d.phone,
      ].filter(Boolean),
    }));
  const withoutLocation = donors.length - pins.length;
  const showExtra = donors.some((d) => d.address !== undefined); // admins see address and last donation
  const columns = showExtra ? 7 : 5;

  return (
    <div className="page">
      <h2>Find compatible donors</h2>
      <p className="page-sub">
        Pick the patient's blood group. Add a location and distance to see who is nearby on the map.
      </p>

      <form onSubmit={handleSubmit} className="search-bar">
        <select
          aria-label="Patient blood group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          required
        >
          <option value="" disabled>
            Patient blood group
          </option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </select>
        <select aria-label="Distance" value={radius} onChange={(e) => setRadius(e.target.value)}>
          <option value="any">Any distance</option>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              Within {r} km
            </option>
          ))}
        </select>
        <LocationButton onLocate={(lat, lng) => setCenter({ lat, lng })} saved={!!center} />
        <button type="submit">Find donors</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p>Searching...</p>}

      <MapView
        center={center}
        radiusKm={radius !== "any" && center ? Number(radius) : null}
        markers={pins}
        onPick={pickCenter}
        height={360}
      />
      <p className="map-legend">
        <span className="dot exact" /> Same blood group <span className="dot compat" /> Compatible group
        <small> &nbsp; Click the map to move the search centre. Pins and distances are approximate to protect donor privacy. Phone numbers are hidden until you press "Show number" (limited per day and logged).</small>
      </p>

      {result && (
        <>
          <h3>Blood in stock that a {result.recipientGroup} patient can receive</h3>
          <div className="chip-row">
            {result.stock.map((s) => (
              <span
                key={s.bloodGroup}
                className={`chip ${s.exact ? "exact" : ""} ${s.unitsAvailable === 0 ? "empty" : ""}`}
              >
                {s.bloodGroup}: {s.unitsAvailable} unit(s){s.exact ? " (same group)" : ""}
              </span>
            ))}
          </div>

          <h3>
            Eligible donors ({donors.length})
            {result.center && <small> within {result.center.radiusKm} km</small>}
          </h3>
          {withoutLocation > 0 && result.center === null && (
            <p className="page-sub">
              {withoutLocation} donor(s) have not shared a location, so they are not on the map.
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>Match</th>
                <th>Distance</th>
                <th>Phone</th>
                {showExtra && <th>Address</th>}
                {showExtra && <th>Last donation</th>}
              </tr>
            </thead>
            <tbody>
              {donors.map((d) => (
                <tr key={d._id}>
                  <td>{d.name}</td>
                  <td>{d.bloodGroup}</td>
                  <td>
                    <span className={`badge ${d.match === "exact" ? "fulfilled" : "approved"}`}>
                      {d.match}
                    </span>
                  </td>
                  <td>{d.distanceKm !== null ? `${showExtra ? "" : "about "}${d.distanceKm} km` : "-"}</td>
                  <td>
                    {d.phone || revealed[d._id] ? (
                      <a href={`tel:${d.phone || revealed[d._id]}`}>{d.phone || revealed[d._id]}</a>
                    ) : (
                      <>
                        {d.phoneMasked}{" "}
                        <button type="button" className="ghost" onClick={() => revealPhone(d._id)}>
                          Show number
                        </button>
                      </>
                    )}
                  </td>
                  {showExtra && <td>{d.address}</td>}
                  {showExtra && (
                    <td>
                      {d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : "Never"}
                    </td>
                  )}
                </tr>
              ))}
              {donors.length === 0 && (
                <tr>
                  <td colSpan={columns}>
                    No eligible donors found
                    {result.center ? " in this area. Try a bigger distance." : " for this blood group right now."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
