// SegmentedControl — återanvändbar tab/toggle-kontroll.
// Ersätter de tidigare duplicerade knappgrupperna (vy-väljare + aggregerat/dag
// i App, ChartModal och ReportView). CSS-driven hover (se .seg i index.css),
// korrekt tangentbords-/skärmläsarstöd (role=tablist/tab, aria-selected).

export interface SegItem {
  id: string;
  label: string;
  /** Inaktiverat alternativ (gråmarkeras, ej klickbart) */
  disabled?: boolean;
}

interface Props {
  items: SegItem[];
  value: string;
  onChange: (id: string) => void;
  size?: "md" | "sm";
  ariaLabel: string;
}

export default function SegmentedControl({
  items, value, onChange, size = "md", ariaLabel,
}: Props) {
  return (
    <div className={`seg seg--${size}`} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          type="button"
          aria-selected={value === it.id}
          aria-disabled={it.disabled}
          data-active={value === it.id}
          disabled={it.disabled}
          className="seg__btn"
          onClick={() => { if (!it.disabled) onChange(it.id); }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
