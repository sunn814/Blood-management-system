// Simple horizontal bar chart made with plain HTML/CSS (no chart library).
// data: [{ label, value, tone }]   tone: "low" | "medium" | "high" | "info"
export default function BarChart({ title, data, unit = "" }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="bar-chart">
      <figcaption>{title}</figcaption>
      <ul>
        {data.map((d) => (
          <li key={d.label}>
            <span className="bar-label">{d.label}</span>
            <span className="bar-track">
              <span
                className={`bar-fill ${d.tone || "info"}`}
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </span>
            <span className="bar-value">
              {d.value}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
