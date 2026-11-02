import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api/axios";
import LocationButton from "../components/LocationButton";
import { useAuth } from "../context/AuthContext";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Donors() {
  const { user } = useAuth();
  const [donors, setDonors] = useState([]);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [myDonor, setMyDonor] = useState(null);
  const [form, setForm] = useState({ name: "", age: "", bloodGroup: "", phone: "", address: "" });
  const [message, setMessage] = useState("");

  const fetchDonors = async () => {
    const { data } = await api.get("/donors", {
      params: { search: search || undefined, bloodGroup: filterGroup || undefined },
    });
    setDonors(data);
  };

  const fetchMyProfile = async () => {
    const { data } = await api.get("/donors/me");
    setMyDonor(data);
  };

  useEffect(() => {
    if (user.role === "admin") fetchDonors();
    else if (user.role === "donor") fetchMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDonors();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const { data } = await api.post("/donors", form);
      setMyDonor(data);
      setMessage("Donor profile created successfully!");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to register as donor");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this donor record?")) return;
    await api.delete(`/donors/${id}`);
    fetchDonors();
  };

  const handleRecordDonation = async (id) => {
    try {
      await api.post(`/donors/${id}/donate`, { units: 1 });
      fetchDonors();
    } catch (err) {
      alert(err.response?.data?.message || "Could not record donation");
    }
  };

  if (user.role === "hospital") return <Navigate to="/matcher" replace />;

  if (user.role !== "admin") {
    return (
      <div className="page">
        <h2>My Donor Profile</h2>
        {message && <p className="info">{message}</p>}
        {myDonor ? (
          <div className="card">
            <p><strong>Name:</strong> {myDonor.name}</p>
            <p><strong>Blood Group:</strong> {myDonor.bloodGroup}</p>
            <p><strong>Total Donations:</strong> {myDonor.totalDonations}</p>
            <p>
              <strong>Last Donation:</strong>{" "}
              {myDonor.lastDonationDate
                ? new Date(myDonor.lastDonationDate).toLocaleDateString()
                : "Never donated yet"}
            </p>
            <p>
              <strong>Location:</strong> {myDonor.location ? "Saved" : "Not added yet"}{" "}
              <LocationButton
                label="Add my location"
                saved={!!myDonor.location}
                onLocate={async (lat, lng) => {
                  const { data } = await api.put(`/donors/${myDonor._id}`, { latitude: lat, longitude: lng });
                  setMyDonor(data);
                }}
              />
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {myDonor.eligible
                ? "Eligible to donate"
                : `Eligible again on ${new Date(myDonor.nextEligibleDate).toLocaleDateString()}`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="form-card">
            <input
              placeholder="Full name"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Age"
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              required
            />
            <select
              onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select blood group
              </option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
            <input
              placeholder="Phone"
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <input
              placeholder="Address"
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
            <div>
              <LocationButton
                label="Add my location"
                saved={form.latitude !== undefined}
                onLocate={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
              />
              <small> Optional. Lets hospitals find donors nearby. Only an approximate area is shown.</small>
            </div>
            <button type="submit">Register as donor</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <h2>Donor Management</h2>
      <form onSubmit={handleSearchSubmit} className="search-bar">
        <input
          placeholder="Search by name / phone / address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
          <option value="">All blood groups</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </select>
        <button type="submit">Search</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Group</th>
            <th>Phone</th>
            <th>Total Donations</th>
            <th>Last Donation</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {donors.map((d) => (
            <tr key={d._id}>
              <td>{d.name}</td>
              <td>{d.bloodGroup}</td>
              <td>{d.phone}</td>
              <td>{d.totalDonations}</td>
              <td>
                {d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : "—"}
              </td>
              <td>
                {d.eligible ? (
                  <span className="badge fulfilled">Eligible</span>
                ) : (
                  <span className="badge pending">
                    Wait till {new Date(d.nextEligibleDate).toLocaleDateString()}
                  </span>
                )}
              </td>
              <td>
                <button disabled={!d.eligible} onClick={() => handleRecordDonation(d._id)}>
                  Record Donation
                </button>
                <button className="danger" onClick={() => handleDelete(d._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {donors.length === 0 && (
            <tr>
              <td colSpan="7">No donors found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
