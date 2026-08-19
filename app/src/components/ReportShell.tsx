import { useState, useEffect } from "react";
import type { VyData, KpiData, Scope } from "../types";
import { loadView, loadManifest } from "../data/load";
import { VY_ORDNING, DEFAULT_VY, giltigaVyer, oppningsVy, type VyId } from "../utils/vyval";
import ReportView from "./ReportView";
import ChartModal from "./ChartModal";

// ════════════════════════════════════════════════════════════
//  ReportShell — äger tidsvyn (aktivVy), laddar data och vet vilka
//  vyer som är giltiga för valt sakområde. Matar den befintliga
//  ReportView med färdig VyData. Tidsperioden väljs alltså HÄR inne,
//  inte globalt eller på startsidan.
//
//  Vilken vy rapporten ÖPPNAS i avgörs av utils/vyval.ts, som startsidan
//  också använder för sina siffror. Ändra regeln där, inte här.
// ════════════════════════════════════════════════════════════

const VY_TEXT: Record<VyId, string> = {
  dag: "Dag", vecka: "Vecka", manad: "Månad", kvartal: "Kvartal", ar: "År",
};

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
  const [tillgangligaVyer, setTillgangligaVyer] = useState<VyId[]>([...VY_ORDNING]);

  // Bestäm giltiga vyer för scope och öppna rapporten i vyval.ts vy.
  useEffect(() => {
    let cancelled = false;
    loadManifest().then((manifest) => {
      if (cancelled) return;
      setTillgangligaVyer(giltigaVyer(manifest, scope));
      const oppna = oppningsVy(manifest, scope);
      if (oppna) setAktivVy(oppna);
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

  const vyItems = VY_ORDNING.map((v) => ({ id: v, label: VY_TEXT[v], disabled: !tillgangligaVyer.includes(v) }));

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
