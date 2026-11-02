import { useEffect, useState } from "react";
import api from "../api/axios";
import BarChart from "../components/BarChart";

const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Reports() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get("/requests/reports").then(({ data }) => setReport(data));
  }, []);

  if (!report) return <div className="page">Loading report...</div>;

  const stockMap = Object.fromEntries(report.stock.map((s) => [s.bloodGroup, s.unitsAvailable]));
  const requestMap = Object.fromEntries(report.requestsByGroup.map((r) => [r._id, r.count]));
  const stockData = GROUPS.map((g) => {
    const value = stockMap[g] || 0;
    return { label: g, value, tone: value <= 5 ? "low" : value <= 15 ? "medium" : "high" };
  });
  const requestData = GROUPS.map((g) => ({ label: g, value: requestMap[g] || 0, tone: "info" }));

  return (
    <div className="page">
      <h2>Reports</h2>

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

      <div className="chart-grid">
        <BarChart title="Stock by blood group (units)" data={stockData} />
        <BarChart title="Requests by blood group" data={requestData} />
      </div>
    </div>
  );
}
