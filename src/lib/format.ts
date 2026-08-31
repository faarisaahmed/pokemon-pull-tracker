export function usd(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n == null) return "—";
  if (opts.compact && n >= 1000) return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  if (n < 1) return `$${n.toFixed(2)}`;
  if (n < 1000) return `$${n.toFixed(2)}`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function pct(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n < 0.0001) return `${(n * 100).toFixed(4)}%`;
  if (n < 0.01) return `${(n * 100).toFixed(3)}%`;
  return `${(n * 100).toFixed(2)}%`;
}

export function oneIn(p: number | null | undefined): string {
  if (p == null || p <= 0) return "—";
  const n = 1 / p;
  if (n < 10) return `1 in ${n.toFixed(1)}`;
  if (n < 1000) return `1 in ${Math.round(n)}`;
  return `1 in ${Math.round(n).toLocaleString()}`;
}

export function shortDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m] = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return m ? `${months[Number(m) - 1]} ${y}` : y;
}

export function fullDate(d: string | null | undefined): string {
  if (!d) return "Unknown";
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
