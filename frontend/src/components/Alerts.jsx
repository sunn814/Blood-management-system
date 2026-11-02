import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

// Shows urgent alerts on the dashboard. What is shown depends on the user's role.
export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    api
      .get("/alerts")
      .then(({ data }) => setAlerts(data))
      .catch(() => setAlerts(null));
  }, []);

  if (!alerts) return null;

  const { lowStock = [], urgentRequests = [], donor } = alerts;
  const nothing = !lowStock.length && !urgentRequests.length && !donor?.urgentMatches?.length;
  if (nothing) return null;

  return (
    <div className="alert-box">
      {urgentRequests.length > 0 && (
        <div className="alert urgent">
          <strong>🚨 {urgentRequests.length} urgent request(s) waiting</strong>
          <ul>
            {urgentRequests.map((r) => (
              <li key={r._id}>
                {r.patientName} needs {r.unitsRequired} unit(s) of {r.bloodGroup} at {r.hospitalName}{" "}
                ({r.status}) – <Link to={`/matcher?group=${encodeURIComponent(r.bloodGroup)}`}>find donors</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {user.role === "donor" && donor?.urgentMatches?.length > 0 && (
        <div className="alert urgent">
          <strong>🩸 Your blood group ({donor.bloodGroup}) can help urgent patients right now.</strong>
          <p>
            {donor.eligible
              ? "You are eligible to donate – please contact the blood bank."
              : `You can donate again on ${new Date(donor.nextEligibleDate).toLocaleDateString()}.`}
          </p>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="alert warning">
          <strong>⚠️ Low stock:</strong>{" "}
          {lowStock.map((s) => (
            <span key={s.bloodGroup} className="chip empty">
              {s.bloodGroup}: {s.unitsAvailable}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
