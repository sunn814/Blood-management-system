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

  return (
    <div className="page">
      <h2>Blood Stock</h2>
      <div className="stock-grid">
        {stock.map((s) => (
          <div key={s.bloodGroup} className={`stock-card ${getLevelClass(s.unitsAvailable)}`}>
            <h3>{s.bloodGroup}</h3>
            {editing === s.bloodGroup ? (
              <>
                <input
                  type="number"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  min="0"
                />
                <button onClick={() => saveEdit(s.bloodGroup)}>Save</button>
              </>
            ) : (
              <>
                <p className="units">{s.unitsAvailable} units</p>
                {user.role === "admin" && <button onClick={() => startEdit(s)}>Edit</button>}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
