import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function BloodStock() {
  const { user } = useAuth();
  const [stock, setStock] = useState([]);
  const [editing, setEditing] = useState(null);
  const [units, setUnits] = useState("");

  const fetchStock = async () => {
    const { data } = await api.get("/stock");
    setStock(data.sort((a, b) => a.bloodGroup.localeCompare(b.bloodGroup)));
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const startEdit = (item) => {
    setEditing(item.bloodGroup);
    setUnits(item.unitsAvailable);
  };

  const saveEdit = async (bloodGroup) => {
    await api.put(`/stock/${bloodGroup}`, { unitsAvailable: Number(units) });
    setEditing(null);
    fetchStock();
  };

  const getLevelClass = (units) => {
    if (units <= 5) return "low";
    if (units <= 15) return "medium";
    return "high";
  };

  const LEVEL_TEXT = { low: "Low", medium: "Medium", high: "Good" };
  const FULL_UNITS = 30; // gauge is full at 30 units

  return (
    <div className="page">
      <h2>Blood stock</h2>
      <p className="page-sub">Units available for each blood group.</p>
      <div className="stock-grid">
        {stock.map((s) => {
          const level = getLevelClass(s.unitsAvailable);
          const fill = Math.min(100, (s.unitsAvailable / FULL_UNITS) * 100);
          return (
            <div key={s.bloodGroup} className={`stock-card ${level}`} style={{ "--fill": `${fill}%` }}>
              <div className="gauge" aria-hidden="true">
                <span />
              </div>
              <div className="stock-info">
                <h3>{s.bloodGroup}</h3>
                {editing === s.bloodGroup ? (
                  <>
                    <input
                      type="number"
                      aria-label={`Units of ${s.bloodGroup}`}
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      min="0"
                    />
                    <button onClick={() => saveEdit(s.bloodGroup)}>Save</button>
                  </>
                ) : (
                  <>
                    <p className="units">
                      <b>{s.unitsAvailable}</b> units
                    </p>
                    <p className="level-text">{LEVEL_TEXT[level]}</p>
                    {user.role === "admin" && (
                      <button className="ghost" onClick={() => startEdit(s)}>
                        Edit units
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
