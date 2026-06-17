import type { DashboardTimePoint } from "../../types/dashboard";

interface BarChartProps {
  data: DashboardTimePoint[];
  color?: string;
  label?: string;
}

function formatWeek(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function BarChart({ data, color = "#3b82f6", label }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="db-chart" role="img" aria-label={label}>
      <div className="db-chart__bars">
        {data.map((point) => (
          <div key={point.week_start} className="db-chart__col">
            <div className="db-chart__bar-wrap">
              <div
                className="db-chart__bar"
                style={{
                  height: `${(point.count / max) * 100}%`,
                  background: color,
                }}
                title={`${formatWeek(point.week_start)}: ${point.count}`}
              />
            </div>
            <span className="db-chart__label">{formatWeek(point.week_start)}</span>
            <span className="db-chart__value">{point.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MultiBarChartProps {
  series: { label: string; data: DashboardTimePoint[]; color: string }[];
}

export function MultiBarChart({ series }: MultiBarChartProps) {
  const allPoints = series[0]?.data ?? [];
  const max = Math.max(
    ...series.flatMap((s) => s.data.map((d) => d.count)),
    1
  );

  return (
    <div className="db-chart db-chart--multi">
      <div className="db-chart__legend">
        {series.map((s) => (
          <span key={s.label} className="db-chart__legend-item">
            <span className="db-chart__legend-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="db-chart__bars">
        {allPoints.map((_, idx) => (
          <div key={allPoints[idx].week_start} className="db-chart__col db-chart__col--grouped">
            <div className="db-chart__group">
              {series.map((s) => {
                const point = s.data[idx];
                return (
                  <div key={s.label} className="db-chart__bar-wrap db-chart__bar-wrap--sm">
                    <div
                      className="db-chart__bar"
                      style={{
                        height: `${((point?.count ?? 0) / max) * 100}%`,
                        background: s.color,
                      }}
                      title={`${s.label}: ${point?.count ?? 0}`}
                    />
                  </div>
                );
              })}
            </div>
            <span className="db-chart__label">{formatWeek(allPoints[idx].week_start)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <p className="db-chart__empty">Nessun dato disponibile</p>;
  }

  let cumulative = 0;
  const gradientParts = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (cumulative / total) * 100;
      cumulative += s.value;
      const end = (cumulative / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    });

  return (
    <div className="db-donut">
      <div
        className="db-donut__ring"
        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
      >
        <div className="db-donut__hole">
          <strong>{total}</strong>
          <span>totale</span>
        </div>
      </div>
      <ul className="db-donut__legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="db-chart__legend-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
