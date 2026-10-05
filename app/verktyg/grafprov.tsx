// grafprov.tsx — Provbänk för diagrammen, för visuell granskning utan att
// klicka sig genom rapporten. Körs bara i dev-servern:
//
//   http://localhost:5173/verktyg/grafprov.html?vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179
//
// Frågeparametrar:
//   vy, sektion, kpi   vilken JSON-fil och indikator (default första i filen)
//   w                  containerbredd i px (default 820)
//   pin                kommaseparerade regionnamn som ska vara fästa
//   hover              "fx,fy" — andel av plotytan (0–1) där en musrörelse
//                      simuleras efter rendering, t.ex. hover=0.55,0.4
//   click=1            klicka på hover-positionen (fäster hovrad region)
//
// Skärmdump: msedge --headless=new --screenshot=ut.png --window-size=1000,800 <url>

import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
// Samma stilordning som main.tsx: reset och självhostade typsnitt, tema, gamla vyn.
import "../src/styles/index.css";
import "virtual:tema.css";
import "../src/index.css";
import FacetedChart from "../src/components/FacetedChart";
import type { KpiData } from "../src/types";

const q = new URLSearchParams(location.search);
const vy = q.get("vy") ?? "ar";
const sektion = q.get("sektion") ?? "skr-tillganglighet";
const kpiId = q.get("kpi");
const w = Number(q.get("w") ?? 820);
const pin = (q.get("pin") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const hover = (q.get("hover") ?? "").split(",").map(Number);

export function Prov() {
  const [kpi, setKpi] = useState<KpiData | null>(null);
  useEffect(() => {
    fetch(`/data/${vy}-${sektion}.json`).then((r) => r.json()).then((d) => {
      const list: KpiData[] = d.kpier;
      setKpi(list.find((k) => k.id === kpiId) ?? list[0]);
    });
  }, []);

  // Simulera fästning och hover när grafen ritats
  useEffect(() => {
    if (!kpi) return;
    const t = setTimeout(async () => {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
      const rect = document.querySelector<SVGRectElement>("svg rect[role='img']");
      if (!rect) return;
      const b = rect.getBoundingClientRect();
      const move = (fx: number, fy: number) => rect.dispatchEvent(new MouseEvent("mousemove", {
        bubbles: true, clientX: b.left + b.width * fx, clientY: b.top + b.height * fy,
      }));
      if (hover.length === 2 && !hover.some(Number.isNaN)) {
        move(hover[0], hover[1]);
        if (q.get("click")) {
          rect.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: b.left + b.width * hover[0], clientY: b.top + b.height * hover[1] }));
          setTimeout(() => {
            const r2 = document.querySelector<SVGRectElement>("svg rect[role='img']");
            const b2 = r2!.getBoundingClientRect();
            r2!.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: b2.left + b2.width * hover[0], clientY: b2.top + b2.height * hover[1] }));
          }, 300);
        }
      }
    }, 900);
    return () => clearTimeout(t);
  }, [kpi]);

  if (!kpi) return <div style={{ padding: 20 }}>Laddar…</div>;
  const rubrik = kpi.kontext_serier?.length
    ? `${kpi.namn}, Halland jämfört med övriga regioner`
    : kpi.undernivaer?.length ? `${kpi.namn} per avdelning` : `${kpi.namn} över tid`;
  return (
    <div style={{ width: w, margin: "24px auto", background: "#eeeee9", padding: "1px 24px 40px" }}>
      <figure className="figur" style={{ marginTop: 24 }}>
        <FacetedChart kpi={kpi} vy={vy} rubrik={rubrik} underrubrik="Andel i procent per år, 2016–2025. Halland i grönt, övriga regioner i grått, riket streckat, topp 3-zonen som ljusgrönt fält." initialPinned={pin} />
      </figure>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Prov /></StrictMode>);
