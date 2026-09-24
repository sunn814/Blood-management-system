import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Reports() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get("/requests/reports").then(({ data }) => setReport(data));
  }, []);

  if (!report) return <div className="page">Loading report...</div>;

  return (
    <div className="page">
      <h2>Reports & Analytics</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <h3>{report.totalDonors}</h3>
          <p>Total Donors</p>
        </div>
        <div className="stat-card">
          <h3>{report.totalRequests}</h3>
          <p>Total Requests</p>
        </div>
        <div className="stat-card">
          <h3>{report.pendingRequests}</h3>
          <p>Pending Requests</p>
        </div>
        <div className="stat-card">
          <h3>{report.fulfilledRequests}</h3>
          <p>Fulfilled Requests</p>
        </div>
        <div className="stat-card">
          <h3>{report.donationsThisMonth}</h3>
          <p>Donations This Month</p>
        </div>
      </div>

      <h3>Stock by Blood Group</h3>
      <table>
        <thead>
          <tr>
            <th>Blood Group</th>
            <th>Units Available</th>
          </tr>
        </thead>
        <tbody>
          {report.stock.map((s) => (
            <tr key={s.bloodGroup}>
              <td>{s.bloodGroup}</td>
              <td>{s.unitsAvailable}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Requests by Blood Group</h3>
      <table>
        <thead>
          <tr>
            <th>Blood Group</th>
            <th>Request Count</th>
          </tr>
        </thead>
        <tbody>
          {report.requestsByGroup.map((r) => (
            <tr key={r._id}>
              <td>{r._id}</td>
              <td>{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
