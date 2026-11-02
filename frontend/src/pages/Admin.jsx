import { useEffect, useState } from "react";
import api from "../api/axios";

const ACTION_TEXT = {
  approve_hospital: "Approved hospital",
  revoke_hospital: "Revoked hospital",
  reveal_contact: "Viewed donor phone",
  record_donation: "Recorded donation",
  delete_donor: "Deleted donor",
  update_stock: "Changed stock",
  request_fulfilled: "Fulfilled request",
  request_approved: "Approved request",
  request_rejected: "Rejected request",
};

// Admin only: approve hospital accounts and review the audit log.
export default function Admin() {
  const [hospitals, setHospitals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [h, l] = await Promise.all([api.get("/admin/hospitals"), api.get("/admin/audit?limit=50")]);
      setHospitals(h.data);
      setLogs(l.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load admin data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setApproval = async (id, approved) => {
    setError("");
    try {
      await api.put(`/admin/hospitals/${id}/approval`, { approved });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update hospital");
    }
  };

  return (
    <div className="page">
      <h2>Admin</h2>
      <p className="page-sub">Approve hospital accounts and review sensitive actions.</p>
      {error && <p className="error">{error}</p>}

      <h3>Hospital accounts</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {hospitals.map((h) => (
            <tr key={h._id}>
              <td>{h.name}</td>
              <td>{h.email}</td>
              <td>{h.phone || "-"}</td>
              <td>
                <span className={`badge ${h.approved ? "fulfilled" : "pending"}`}>
                  {h.approved ? "Approved" : "Waiting"}
                </span>
              </td>
              <td>
                {h.approved ? (
                  <button className="danger" onClick={() => setApproval(h._id, false)}>
                    Revoke
                  </button>
                ) : (
                  <button onClick={() => setApproval(h._id, true)}>Approve</button>
                )}
              </td>
            </tr>
          ))}
          {hospitals.length === 0 && (
            <tr>
              <td colSpan="5">No hospital accounts yet</td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>Audit log (latest 50)</h3>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l._id}>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
              <td>
                {l.actor?.name || "Deleted user"} <small>({l.actorRole})</small>
              </td>
              <td>{ACTION_TEXT[l.action] || l.action}</td>
              <td>{l.detail || "-"}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan="4">Nothing recorded yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
