import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Alerts from "../components/Alerts";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="page">
      <h2>Welcome, {user.name} 👋</h2>
      <p>Role: {user.role}</p>

      <Alerts />

      {user.role === "hospital" && user.approved === false && (
        <p className="info">
          Your hospital account is waiting for admin approval. You can search donors and raise requests once
          it is approved.
        </p>
      )}

      <div className="card-grid">
        <Link className="card" to="/stock">
          <h3>Blood Stock</h3>
          <p>View available units by blood group</p>
        </Link>
        <Link className="card" to="/requests">
          <h3>Requests</h3>
          <p>
            {user.role === "admin"
              ? "Manage all incoming blood requests"
              : "Raise or track your blood requests"}
          </p>
        </Link>
        {(user.role === "admin" || user.role === "hospital") && (
          <Link className="card" to="/matcher">
            <h3>Find Compatible Donors</h3>
            <p>Enter a patient's blood group and see who can donate</p>
          </Link>
        )}
        {user.role === "admin" && (
          <>
            <Link className="card" to="/donors">
              <h3>Donors</h3>
              <p>Search, manage and record donations</p>
            </Link>
            <Link className="card" to="/reports">
              <h3>Reports</h3>
              <p>Stock levels, donation & request stats</p>
            </Link>
          </>
        )}
        {user.role === "donor" && (
          <Link className="card" to="/donors">
            <h3>My Donor Profile</h3>
            <p>Register or update your donor details</p>
          </Link>
        )}
      </div>
    </div>
  );
}
