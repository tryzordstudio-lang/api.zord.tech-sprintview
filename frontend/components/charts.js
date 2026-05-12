import { useId } from "react";

function buildPath(points, width, height) {
  if (!points.length) {
    return "";
  }

  const max = Math.max(...points.map((point) => point.value), 1);
  const stepX = width / Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - (point.value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function SparklineChart({ data }) {
  const gradientId = useId();
  const width = 320;
  const height = 120;
  const path = buildPath(data, width, height);
  const axisStyle = {
    gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))`
  };

  return (
    <div className="chart-stack">
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="sparkline-chart" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
          </linearGradient>
        </defs>
        <path d={`M 0 ${height} ${path} L ${width} ${height} Z`} fill={`url(#${gradientId})`} />
        <path d={path} className="sparkline-stroke" />
      </svg>
      <div className="chart-axis" style={axisStyle}>
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let start = 0;

  return (
    <div className="donut-layout">
      <svg viewBox="0 0 120 120" className="donut-chart" role="img" aria-label="Distribution chart">
        {data.map((item) => {
          const value = item.value / total;
          const end = start + value;
          const largeArc = value > 0.5 ? 1 : 0;
          const startAngle = start * Math.PI * 2 - Math.PI / 2;
          const endAngle = end * Math.PI * 2 - Math.PI / 2;
          const x1 = 60 + 42 * Math.cos(startAngle);
          const y1 = 60 + 42 * Math.sin(startAngle);
          const x2 = 60 + 42 * Math.cos(endAngle);
          const y2 = 60 + 42 * Math.sin(endAngle);
          const strokeClass = `chart-tone-${item.tone || "default"}`;
          const path = `M ${x1} ${y1} A 42 42 0 ${largeArc} 1 ${x2} ${y2}`;
          start = end;

          return <path key={item.label} d={path} className={strokeClass} />;
        })}
        <circle cx="60" cy="60" r="24" className="donut-hole" />
      </svg>

      <div className="chart-legend">
        {data.map((item) => (
          <div key={item.label} className="legend-row">
            <span className={`legend-dot chart-tone-fill-${item.tone || "default"}`} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="bar-chart">
      {data.map((item) => (
        <div key={item.label} className="bar-row">
          <div className="bar-meta">
            <span>{item.label}</span>
            <strong>{item.value}%</strong>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
