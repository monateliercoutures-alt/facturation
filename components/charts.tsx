"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatAmount, formatFCFA } from "@/lib/format";

/** 1 250 000 → « 1,3 M », 60 000 → « 60 k » : lisible sur un axe étroit de téléphone. */
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "")} M`;
  if (n >= 1000) return `${Math.round(n / 1000)} k`;
  return String(n);
}

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--ink)", fontSize: 14 };

export function MonthlyBars({ data }: { data: { label: string; invoiced: number; collected: number }[] }) {
  const empty = data.every((d) => d.invoiced === 0 && d.collected === 0);
  return (
    <figure>
      <div role="img" aria-label="Montants facturés et encaissés par mois, sur 12 mois" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tick={{ fill: "var(--mut)", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tick={{ fill: "var(--mut)", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
            <Tooltip cursor={{ fill: "var(--gs)" }} contentStyle={tooltipStyle} formatter={(v) => formatFCFA(Number(v))} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="invoiced" name="Facturé" fill="var(--o)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="collected" name="Encaissé" fill="var(--g)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {empty ? <figcaption className="hint text-center">Aucune facture sur les 12 derniers mois.</figcaption> : null}
      <details className="mt-2 text-sm">
        <summary className="min-h-11 cursor-pointer py-2.5 font-semibold text-g">Voir les chiffres</summary>
        <table className="w-full">
          <thead>
            <tr className="text-left text-mut">
              <th className="py-1 font-semibold">Mois</th>
              <th className="py-1 text-right font-semibold">Facturé</th>
              <th className="py-1 text-right font-semibold">Encaissé</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t border-line">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right">{formatAmount(d.invoiced)}</td>
                <td className="py-1 text-right">{formatAmount(d.collected)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

const SLICES = ["var(--g)", "var(--o)", "#2f80ed", "#9b51e0", "#eb5757", "var(--mut)"];

export function MethodDonut({ data }: { data: { name: string; amount: number }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return <p className="text-mut">Aucun paiement encaissé sur cette période.</p>;
  return (
    <div>
      <div role="img" aria-label="Répartition des encaissements par moyen de paiement" className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="name" innerRadius="58%" outerRadius="90%" paddingAngle={2} stroke="var(--card)">
              {data.map((_, i) => <Cell key={i} fill={SLICES[i % SLICES.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatFCFA(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span aria-hidden className="inline-block size-3 rounded-full" style={{ background: SLICES[i % SLICES.length] }} />
              {d.name}
            </span>
            <span className="font-semibold">
              {formatFCFA(d.amount)} <span className="font-normal text-mut">({Math.round((d.amount / total) * 100)} %)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
