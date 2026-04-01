export function fmtVarde(v: number, enhet: string, decimals?: number): string {
  const dec = decimals ?? (enhet === "procent" ? 1 : 0);
  return v.toLocaleString("sv-SE", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function fmtSuffix(enhet: string): string {
  if (enhet === "procent") return "%";
  if (enhet === "minuter") return " min";
  return "";
}

export function fmtChange(value: number, _enhet: string): string {
  return Math.abs(value).toLocaleString("sv-SE", { maximumFractionDigits: 1 });
}

export function changeUnit(enhet: string): string {
  return enhet === "procent" ? " pp" : "";
}

/** Bygg etikett med år — lägger till år om det saknas (dag/vecka) */
export function fullEtikett(etikett: string, period: string, vy?: string): string {
  const year = period.slice(0, 4);
  if (vy === "dag") return `${etikett} ${year}`;
  if (vy === "vecka") return `${etikett}, ${year}`;
  return etikett;
}

/** Period-range med årkontext */
export function periodRangeLabel(
  tidsserie: { etikett: string; period: string }[],
  vy?: string,
): string {
  if (tidsserie.length === 0) return "";
  const first = tidsserie[0];
  const last = tidsserie[tidsserie.length - 1];
  const f = fullEtikett(first.etikett, first.period, vy);
  const l = fullEtikett(last.etikett, last.period, vy);
  return f === l ? f : `${f}\u2013${l}`;
}
