import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import LocationButton from "../components/LocationButton";
import { useAuth } from "../context/AuthContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patientName: "",
    bloodGroup: "",
    unitsRequired: 1,
    hospitalName: "",
    contactNumber: "",
    urgency: "Medium",
  });
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    const { data } = await api.get("/requests", {
      params: { status: statusFilter || undefined },
    });
    setRequests(data);
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/requests", form);
      setShowForm(false);
      setForm({
        patientName: "",
        bloodGroup: "",
        unitsRequired: 1,
        hospitalName: "",
        contactNumber: "",
        urgency: "Medium",
      });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create request");
    }
  };

  const updateStatus = async (id, status, fromGroup) => {
    try {
      await api.put(`/requests/${id}/status`, { status, fromGroup });
      fetchRequests();
    } catch (err) {
      const data = err.response?.data;
      // Not enough stock of the exact group: offer compatible groups that have enough units
      if (status === "Fulfilled" && data?.alternatives?.length) {
        const options = data.alternatives
          .map((a) => `${a.bloodGroup} (${a.unitsAvailable} units)`)
          .join(", ");
        const choice = window.prompt(
          `${data.message}.\nCompatible groups with enough stock: ${options}\n\nType a blood group to fulfil from it, or press Cancel:`
        );
        if (choice && choice.trim()) updateStatus(id, "Fulfilled", choice.trim().toUpperCase());
        return;
      }
      alert(data?.message || "Failed to update status");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Blood Requests</h2>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Request"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="form-card">
          {error && <p className="error">{error}</p>}
          <input
            placeholder="Patient name"
            value={form.patientName}
            onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            required
          />
          <select
            value={form.bloodGroup}
            onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
            required
          >
            <option value="" disabled>
              Blood group needed
            </option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder="Units required"
            value={form.unitsRequired}
            onChange={(e) => setForm({ ...form, unitsRequired: e.target.value })}
            required
          />
          <input
            placeholder="Hospital name"
            value={form.hospitalName}
            onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
            required
          />
          <input
            placeholder="Contact number"
            value={form.contactNumber}
            onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
            required
          />
          <select
            value={form.urgency}
            onChange={(e) => setForm({ ...form, urgency: e.target.value })}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <div>
            <LocationButton
              label="Add hospital location"
              saved={form.latitude !== undefined}
              onLocate={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
            />
            <small> Optional. Lets the blood bank find donors near the hospital.</small>
          </div>
          <button type="submit">Submit request</button>
        </form>
      )}

      <div className="filter-bar">
        <label>Filter by status: </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Fulfilled">Fulfilled</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Group</th>
            <th>Units</th>
            <th>Hospital</th>
            <th>Urgency</th>
            <th>Status</th>
            {user.role === "admin" && <th>Actions</th>}
            <th>Tracking</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r._id}>
              <td>{r.patientName}</td>
              <td>{r.bloodGroup}</td>
              <td>{r.unitsRequired}</td>
              <td>{r.hospitalName}</td>
              <td>
                <span className={`urgency ${r.urgency.toLowerCase()}`}>{r.urgency}</span>
              </td>
              <td>
                <span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span>
                {r.fulfilledFrom && r.fulfilledFrom !== r.bloodGroup && (
                  <small> (used {r.fulfilledFrom})</small>
                )}
              </td>
              {user.role === "admin" && (
                <td>
                  {r.status === "Pending" && (
                    <>
                      <button onClick={() => updateStatus(r._id, "Approved")}>Approve</button>
                      <button className="danger" onClick={() => updateStatus(r._id, "Rejected")}>
                        Reject
                      </button>
                    </>
                  )}
                  {(r.status === "Pending" || r.status === "Approved") && (
                    <Link className="link-btn" to={`/matcher?group=${encodeURIComponent(r.bloodGroup)}${
                      r.location ? `&lat=${r.location.coordinates[1]}&lng=${r.location.coordinates[0]}` : ""
                    }`}>
                      Find donors
                    </Link>
                  )}
                  {r.status === "Approved" && (
                    <button onClick={() => updateStatus(r._id, "Fulfilled")}>
                      Mark Fulfilled
                    </button>
                  )}
                </td>
              )}
              <td>
                <Link className="link-btn" to={`/requests/${r._id}`}>
                  Track
                </Link>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={user.role === "admin" ? 8 : 7}>No requests found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
