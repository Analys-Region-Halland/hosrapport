import { useState, useEffect } from "react";
import type { VyData, KpiData, Scope } from "../types";
import { loadView, loadManifest } from "../data/load";
import ReportView from "./ReportView";
import ChartModal from "./ChartModal";

// ════════════════════════════════════════════════════════════
//  ReportShell — äger tidsvyn (aktivVy), laddar data och vet vilka
//  vyer som är giltiga för valt sakområde. Matar den befintliga
//  ReportView med färdig VyData. Tidsperioden väljs alltså HÄR inne,
//  inte globalt eller på startsidan.
// ════════════════════════════════════════════════════════════

type VyId = "dag" | "vecka" | "manad" | "kvartal" | "ar";

const VYER: { id: VyId; text: string }[] = [
  { id: "dag", text: "Dag" },
  { id: "vecka", text: "Vecka" },
  { id: "manad", text: "Månad" },
  { id: "kvartal", text: "Kvartal" },
  { id: "ar", text: "År" },
];

const DEFAULT_VY: VyId = "manad";

interface Props {
  scope: Scope;
  onBack: () => void;
}

export default function ReportShell({ scope, onBack }: Props) {
  const [aktivVy, setAktivVy] = useState<VyId>(DEFAULT_VY);
  const [visaDagar, setVisaDagar] = useState(false);
  const [data, setData] = useState<VyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartKpi, setChartKpi] = useState<KpiData | null>(null);

  // Vilka vyer innehåller valt sakområde? ("alla" → samtliga vyer.)
  const [tillgangligaVyer, setTillgangligaVyer] = useState<VyId[]>(VYER.map((v) => v.id));

  // Bestäm giltiga vyer för scope och justera aktivVy om den saknar området.
  useEffect(() => {
    let cancelled = false;
    loadManifest().then((manifest) => {
      if (cancelled) return;
      const giltiga = VYER.map((v) => v.id).filter((vy) => {
        const m = manifest[vy];
        if (!m) return false;
        return scope === "alla" || m.sektioner.some((s) => s.id === scope);
      });
      setTillgangligaVyer(giltiga);
      // Om nuvarande vy inte rymmer området: byt till default om möjligt, annars första giltiga.
      setAktivVy((nuvarande) =>
        giltiga.includes(nuvarande)
          ? nuvarande
          : giltiga.includes(DEFAULT_VY) ? DEFAULT_VY : (giltiga[0] ?? nuvarande),
      );
    }).catch(() => { /* fel hanteras av loadView nedan */ });
    return () => { cancelled = true; };
  }, [scope]);

  // Lazy-ladda aktiv vy (cachat i load.ts). Nollställning till "laddar" sker i
  // cleanupen (körs vid vy-byte innan ny hämtning) — så undviker vi synkron
  // setState i effektkroppen (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    loadView(aktivVy)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; setData(null); };
  }, [aktivVy]);

  const bytVy = (vy: string) => { setAktivVy(vy as VyId); setVisaDagar(false); };

  const vyItems = VYER.map((v) => ({ id: v.id, label: v.text, disabled: !tillgangligaVyer.includes(v.id) }));

  return (
    <>
      <ReportView
        data={data}
        error={error}
        sectionId={scope === "alla" ? undefined : scope}
        aktivVy={aktivVy}
        vyItems={vyItems}
        onChangeVy={bytVy}
        visaDagar={visaDagar}
        onChangeVisaDagar={setVisaDagar}
        onOpenChart={setChartKpi}
        onBack={onBack}
      />
      {chartKpi && data && (
        <ChartModal kpi={chartKpi} vyData={data} visaDagar={visaDagar} onClose={() => setChartKpi(null)} />
      )}
    </>
  );
}
