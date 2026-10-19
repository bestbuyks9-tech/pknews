"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { num } from "./format";

/** Share-of-total donut with a legend that carries every value and percentage. */
export default function Donut({ title, note, rows, extra }: { title: string; note?: string; rows: { name: string; views: number; color: string }[]; extra?: React.ReactNode }) {
  const total = rows.reduce((a, r) => a + r.views, 0);
  return (
    <div className="an-panel">
      <h3>{title}</h3>
      {note && <p className="muted an-note">{note}</p>}
      {total === 0 ? <p className="muted">Ende pa të dhëna.</p> : (
        <div className="an-donut">
          <div className="an-donut-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="views" nameKey="name" innerRadius="62%" outerRadius="100%" stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                  {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${num(Number(v))} (${Math.round((Number(v) / total) * 100)}%)`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="an-legend">
            {rows.map((r) => (
              <li key={r.name}>
                <i style={{ background: r.color }} aria-hidden="true" />
                <span>{r.name}</span>
                <b>{Math.round((r.views / total) * 100)}%</b>
                <small>{num(r.views)}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
      {extra}
    </div>
  );
}
