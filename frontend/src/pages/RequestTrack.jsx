import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";

const STEPS = ["Pending", "Approved", "Fulfilled"];

const STEP_TEXT = {
  Pending: "Request placed",
  Approved: "Approved by the blood bank",
  Fulfilled: "Blood issued",
  Rejected: "Rejected",
};

const formatTime = (d) =>
  new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

// Request tracking: progress steps, full history and where the blood is needed.
export default function RequestTrack() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/requests/${id}`)
      .then(({ data }) => setRequest(data))
      .catch((err) => setError(err.response?.data?.message || "Could not load this request"));
  }, [id]);

  if (error)
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/requests">Back to requests</Link>
      </div>
    );
  if (!request) return <div className="page">Loading request...</div>;

  const rejected = request.status === "Rejected";
  const currentIndex = STEPS.indexOf(request.status);

  // Older requests have no saved history: show at least when they were placed.
  const history = request.statusHistory?.length
    ? request.statusHistory
    : [{ status: "Pending", changedAt: request.createdAt, note: "Request placed" }];

  const loc = request.location
    ? { lat: request.location.coordinates[1], lng: request.location.coordinates[0] }
    : null;

  return (
    <div className="page">
      <Link to="/requests">&larr; All requests</Link>
      <div className="page-header">
        <h2>
          {request.bloodGroup} for {request.patientName}
        </h2>
        <span className={`badge ${request.status.toLowerCase()}`}>{request.status}</span>
      </div>
      <p className="page-sub">
        {request.unitsRequired} unit(s) at {request.hospitalName}. Urgency:{" "}
        <span className={`urgency ${request.urgency.toLowerCase()}`}>{request.urgency}</span>. Contact:{" "}
        {request.contactNumber}.
      </p>

      <ol className="stepper" aria-label="Request progress">
        {STEPS.map((step, i) => {
          const isRejectedStep = rejected && i === 1;
          const done = !rejected && i <= currentIndex;
          return (
            <li key={step} className={`${done ? "done" : ""} ${isRejectedStep ? "rejected" : ""}`}>
              <span className="step-dot" aria-hidden="true" />
              <span>{isRejectedStep ? "Rejected" : step}</span>
            </li>
          );
        })}
      </ol>

      <h3>History</h3>
      <ul className="timeline">
        {history.map((h, i) => (
          <li key={i}>
            <span className={`badge ${h.status.toLowerCase()}`}>{h.status}</span>
            <div>
              <strong>{STEP_TEXT[h.status]}</strong>
              <div className="timeline-meta">
                {formatTime(h.changedAt)}
                {h.changedBy?.name ? ` by ${h.changedBy.name}` : ""}
              </div>
              {h.note && <div>{h.note}</div>}
            </div>
          </li>
        ))}
      </ul>

      {request.fulfilledFrom && request.fulfilledFrom !== request.bloodGroup && (
        <p className="info">Issued from {request.fulfilledFrom} stock, which is compatible with {request.bloodGroup}.</p>
      )}

      {loc && (
        <>
          <h3>Where the blood is needed</h3>
          <MapView center={loc} height={280} />
          {(user.role === "admin" || user.role === "hospital") && request.status !== "Fulfilled" && request.status !== "Rejected" && (
            <p>
              <Link
                className="link-btn"
                to={`/matcher?group=${encodeURIComponent(request.bloodGroup)}&lat=${loc.lat}&lng=${loc.lng}`}
              >
                Find donors near this location
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
